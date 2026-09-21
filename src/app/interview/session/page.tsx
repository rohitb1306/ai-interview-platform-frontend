"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { logInterviewEvent, submitAnswer } from "@/lib/api";
import { QuestionRecorder } from "@/lib/questionRecorder";
import type { Question, StoredInterviewSession } from "@/lib/types";
import { useFaceMonitor } from "@/lib/useFaceMonitor";
import { requestInterviewFullscreen, useProctoring } from "@/lib/useProctoring";

interface SpeechRecognitionResultLike {
  transcript: string;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: { [index: number]: { [index: number]: SpeechRecognitionResultLike; isFinal: boolean }; length: number };
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MIN_ANSWER_LENGTH = 10;
// Low resolution keeps recordings small; enough for a reviewer to see who is there.
const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 320 },
  height: { ideal: 240 },
  frameRate: { ideal: 15 },
  facingMode: "user",
};

function readStoredSession(): StoredInterviewSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("interview_session");
  return raw ? (JSON.parse(raw) as StoredInterviewSession) : null;
}

export default function InterviewSessionPage() {
  const router = useRouter();
  const [sessionId] = useState<string | null>(
    () => readStoredSession()?.sessionId ?? null
  );
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(
    () => readStoredSession()?.question ?? null
  );
  const [answerText, setAnswerText] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [speechRecognitionActive, setSpeechRecognitionActive] = useState(false);
  const [voiceSupported] = useState(() => getSpeechRecognition() !== null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [recorder, setRecorder] = useState<QuestionRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<"denied" | "lost" | null>(null);
  const [mediaAttempt, setMediaAttempt] = useState(0);
  // State drives the face monitor; the ref is what we attach the stream to.
  const [selfView, setSelfView] = useState<HTMLVideoElement | null>(null);
  const selfViewRef = useRef<HTMLVideoElement | null>(null);
  const attachSelfView = useCallback((el: HTMLVideoElement | null) => {
    selfViewRef.current = el;
    setSelfView(el);
  }, []);
  const proctoring = useProctoring(sessionId, currentQuestion?.id ?? null);
  const faceIssue = useFaceMonitor(stream ? selfView : null, sessionId, currentQuestion?.id ?? null);
  const questionIdRef = useRef<string | null>(null);
  useEffect(() => {
    questionIdRef.current = currentQuestion?.id ?? null;
  }, [currentQuestion]);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/interview");
    }
  }, [sessionId, router]);

  // Continuous camera + microphone recording for human review. Required to take the interview.
  useEffect(() => {
    if (!sessionId) return;
    let media: MediaStream | null = null;
    let active: QuestionRecorder | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: CAMERA_CONSTRAINTS })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        media = s;
        // Unplugged camera/mic, or permission revoked mid-interview.
        s.getTracks().forEach((track) =>
          track.addEventListener("ended", () => {
            if (cancelled) return;
            logInterviewEvent(sessionId, questionIdRef.current, "CAMERA_LOST");
            setMediaError("lost");
          })
        );
        active = new QuestionRecorder(s, sessionId, (questionId) =>
          logInterviewEvent(sessionId, questionId, "RECORDING_ERROR")
        );
        setMediaError(null);
        setStream(s);
        setRecorder(active);
      })
      .catch(() => setMediaError("denied"));

    return () => {
      cancelled = true;
      setStream(null);
      setRecorder(null);
      active?.stop().finally(() => media?.getTracks().forEach((t) => t.stop()));
    };
  }, [sessionId, mediaAttempt]);

  useEffect(() => {
    if (selfViewRef.current) selfViewRef.current.srcObject = stream;
  }, [selfView, stream]);

  // One recording per question; starting a new one closes the previous.
  useEffect(() => {
    if (recorder && currentQuestion) recorder.start(currentQuestion.id);
  }, [recorder, currentQuestion]);

  const finishInterview = useCallback(async () => {
    await recorder?.stop();
    sessionStorage.removeItem("interview_session");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    router.push("/interview/complete");
  }, [recorder, router]);

  useEffect(() => {
    if (!currentQuestion || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
    window.speechSynthesis.speak(utterance);
  }, [currentQuestion]);

  function toggleVoiceInput() {
    const RecognitionCtor = getSpeechRecognition();
    if (!RecognitionCtor) return;

    if (speechRecognitionActive) {
      recognitionRef.current?.stop();
      setSpeechRecognitionActive(false);
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswerText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setSpeechRecognitionActive(false);
    recognition.onend = () => setSpeechRecognitionActive(false);

    recognitionRef.current = recognition;
    recognition.start();
    setSpeechRecognitionActive(true);
  }

  async function handleSubmit() {
    if (!sessionId || !currentQuestion || answerText.trim().length < MIN_ANSWER_LENGTH) return;

    setIsSubmittingAnswer(true);
    setError(null);
    try {
      const res = await submitAnswer(sessionId, currentQuestion.id, answerText.trim());
      if (res.is_complete || !res.next_question) {
        await finishInterview();
        return;
      }
      setCurrentQuestion(res.next_question);
      setAnswerText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit answer.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  if (!currentQuestion) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-neutral-600 dark:text-neutral-400">Loading interview...</p>
      </main>
    );
  }

  // The self-view stays mounted under every screen so face checks keep running.
  const selfViewVideo = (
    <video
      ref={attachSelfView}
      autoPlay
      muted
      playsInline
      className={`fixed bottom-4 right-4 z-10 w-40 -scale-x-100 rounded-xl border-2 bg-black shadow-lg ${
        faceIssue ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
      } ${stream ? "" : "hidden"}`}
    />
  );

  let blocker: React.ReactNode = null;
  if (mediaError) {
    blocker = (
      <Blocker
        title={mediaError === "lost" ? "Camera or microphone disconnected" : "Camera and microphone required"}
        body="This interview is video and audio recorded for review by the hiring team. Allow camera and microphone access in your browser's address bar (and check they're connected), then try again."
        action="Try again"
        onAction={() => setMediaAttempt((n) => n + 1)}
      />
    );
  } else if (proctoring.mustEnterFullscreen) {
    blocker = (
      <Blocker
        title="Return to full screen"
        body="The interview runs in full screen. Leaving full screen or switching tabs is logged and shared with the hiring team."
        action="Enter full screen"
        onAction={requestInterviewFullscreen}
      />
    );
  } else if (proctoring.showReturnWarning) {
    blocker = (
      <Blocker
        title="You left the interview window"
        body={`This has been recorded (${proctoring.timesLeft} time${proctoring.timesLeft === 1 ? "" : "s"} so far). Please stay on this screen until you finish.`}
        action="Back to the interview"
        onAction={proctoring.dismissReturnWarning}
      />
    );
  }
  if (blocker) {
    return (
      <>
        {blocker}
        {selfViewVideo}
      </>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      {selfViewVideo}
      <div className="flex items-center gap-2 text-xs text-red-600">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
        {recorder ? "Recording video and audio" : "Starting camera..."}
      </div>
      {faceIssue && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {faceIssue === "NO_FACE"
            ? "We can't see your face. Please stay in front of the camera — this is being logged."
            : "More than one person is visible. Only you should be on camera — this is being logged."}
        </div>
      )}
      <div>
        <div className="text-xs text-neutral-500">
          Question {currentQuestion.number} of {currentQuestion.total}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
            style={{ width: `${(currentQuestion.number / currentQuestion.total) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <p className="text-lg">{currentQuestion.text}</p>
      </div>

      <textarea
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        rows={6}
        placeholder="Type your answer here (or use voice input below)..."
        className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleVoiceInput}
          disabled={!voiceSupported}
          title={voiceSupported ? undefined : "Voice input isn't supported in this browser"}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700"
        >
          {speechRecognitionActive ? "🎙 Listening... (tap to stop)" : "🎙 Speak answer"}
        </button>
        <span className="text-xs text-neutral-500">
          {answerText.trim().length}/{MIN_ANSWER_LENGTH} min characters
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmittingAnswer || answerText.trim().length < MIN_ANSWER_LENGTH}
        className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {isSubmittingAnswer ? "Submitting..." : "Submit answer"}
      </button>
    </main>
  );
}

function Blocker({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 p-8 text-center dark:border-neutral-800">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {action}
        </button>
      </div>
    </main>
  );
}
