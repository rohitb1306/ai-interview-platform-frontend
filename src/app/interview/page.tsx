"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { startInterview, validateToken } from "@/lib/api";
import type { StoredInterviewSession } from "@/lib/types";
import { requestInterviewFullscreen } from "@/lib/useProctoring";

type ValidationState = "CHECKING" | "VALID" | "INVALID" | "EXPIRED";
type MicStatus = "UNTESTED" | "TESTING" | "READY" | "ERROR";

function InterviewLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [validationState, setValidationState] = useState<ValidationState>(
    token ? "CHECKING" : "INVALID"
  );
  const [candidateDetails, setCandidateDetails] = useState<{
    name: string;
    jobTitle: string;
    inProgress: boolean;
    answeredCount: number;
    totalQuestions: number;
  } | null>(null);
  const [micStatus, setMicStatus] = useState<MicStatus>("UNTESTED");
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    validateToken(token)
      .then((res) => {
        if (res.valid) {
          setValidationState("VALID");
          setCandidateDetails({
            name: res.candidate_name ?? "",
            jobTitle: res.job_title ?? "",
            inProgress: res.in_progress ?? false,
            answeredCount: res.answered_count ?? 0,
            totalQuestions: res.total_questions ?? 5,
          });
        } else {
          setValidationState("EXPIRED");
        }
      })
      .catch(() => setValidationState("INVALID"));
  }, [token]);

  async function testMic() {
    setMicStatus("TESTING");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus("READY");
    } catch {
      setMicStatus("ERROR");
    }
  }

  async function handleStart() {
    // Must run synchronously inside the click for the browser to allow it.
    requestInterviewFullscreen();
    setIsStarting(true);
    setStartError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicStatus("READY");
    } catch {
      setMicStatus("ERROR");
      setStartError(
        "Camera and microphone access are required — this interview is video and audio recorded."
      );
      setIsStarting(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return;
    }
    try {
      const res = await startInterview(token);
      if (res.is_complete || !res.question) {
        router.push("/interview/complete");
        return;
      }
      const stored: StoredInterviewSession = {
        sessionId: res.session_id,
        question: res.question,
      };
      sessionStorage.setItem("interview_session", JSON.stringify(stored));
      router.push("/interview/session");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Could not start interview.");
      setIsStarting(false);
    }
  }

  if (validationState === "CHECKING") {
    return <p className="text-center text-neutral-600 dark:text-neutral-400">Checking your link...</p>;
  }

  if (validationState === "INVALID" || validationState === "EXPIRED") {
    return (
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 p-8 text-center dark:border-neutral-800">
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          Your interview link is invalid or has expired. Please reach out to
          the recruiting team for a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-200 p-8 dark:border-neutral-800">
      <h1 className="text-xl font-semibold">
        Welcome{candidateDetails?.name ? `, ${candidateDetails.name}` : ""}!
      </h1>
      {candidateDetails?.inProgress ? (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Welcome back to your AI interview for{" "}
          <strong>{candidateDetails.jobTitle}</strong>. You&apos;ve answered{" "}
          {candidateDetails.answeredCount} of {candidateDetails.totalQuestions}{" "}
          questions — your progress is saved, so you&apos;ll pick up right where
          you left off.
        </p>
      ) : (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          You&apos;re about to start your AI interview for{" "}
          <strong>{candidateDetails?.jobTitle}</strong>. It has{" "}
          {candidateDetails?.totalQuestions ?? 5} questions — answer by typing or
          speaking. If you get disconnected, reopen this link to continue.
        </p>
      )}

      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-neutral-600 dark:text-neutral-400">
        <li>
          Your camera and microphone are recorded for the whole interview, for review by the
          hiring team.
        </li>
        <li>Stay in front of the camera, alone — no face or extra people on camera is logged.</li>
        <li>The interview runs in full screen.</li>
        <li>Switching tabs or apps, or leaving full screen, is logged.</li>
      </ul>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-800">
        <span>Camera &amp; microphone check</span>
        <button
          type="button"
          onClick={testMic}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs dark:border-neutral-700"
        >
          {micStatus === "READY"
            ? "Ready ✓"
            : micStatus === "TESTING"
              ? "Testing..."
              : micStatus === "ERROR"
                ? "Retry"
                : "Test devices"}
        </button>
      </div>
      {micStatus === "ERROR" && (
        <p className="mt-2 text-xs text-red-600">
          Couldn&apos;t access your camera or microphone. Both are required for this
          interview — allow them in your browser&apos;s address bar and try again.
        </p>
      )}

      {startError && <p className="mt-4 text-sm text-red-600">{startError}</p>}

      <button
        type="button"
        onClick={handleStart}
        disabled={isStarting}
        className="mt-6 w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {isStarting
          ? "Loading..."
          : candidateDetails?.inProgress
            ? "Continue interview"
            : "Start AI Interview"}
      </button>
    </div>
  );
}

export default function InterviewLandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <Suspense fallback={<p>Loading...</p>}>
        <InterviewLanding />
      </Suspense>
    </main>
  );
}
