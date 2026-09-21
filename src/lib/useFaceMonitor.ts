"use client";

import { useEffect, useRef, useState } from "react";

import { logInterviewEvent } from "./api";

// Pinned to the installed @mediapipe/tasks-vision version.
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

const CHECK_EVERY_MS = 1000;
// Ignore brief blips (looking down, a hand passing the camera).
const FLAG_AFTER_MS = 3000;

export type FaceIssue = "NO_FACE" | "MULTIPLE_FACES";

type Detector = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => { detections: unknown[] };
  close: () => void;
};

async function createDetector(): Promise<Detector> {
  const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const create = (delegate: "GPU" | "CPU") =>
    FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5,
    });
  try {
    return await create("GPU");
  } catch {
    return await create("CPU");
  }
}

/**
 * Watches the candidate's camera for "no face" or "more than one face". Each issue
 * lasting over FLAG_AFTER_MS is shown to the candidate and logged with its duration.
 */
export function useFaceMonitor(
  video: HTMLVideoElement | null,
  sessionId: string | null,
  questionId: string | null
) {
  const [issue, setIssue] = useState<FaceIssue | null>(null);
  const questionRef = useRef(questionId);
  useEffect(() => {
    questionRef.current = questionId;
  }, [questionId]);

  useEffect(() => {
    if (!video || !sessionId) return;
    let cancelled = false;
    let detector: Detector | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let current: { issue: FaceIssue | null; since: number; flagged: boolean } = {
      issue: null,
      since: Date.now(),
      flagged: false,
    };

    function closeCurrent(now: number) {
      if (current.issue && current.flagged) {
        logInterviewEvent(sessionId!, questionRef.current, current.issue, now - current.since);
      }
    }

    function tick() {
      if (!detector || video!.readyState < 2) return;
      const faces = detector.detectForVideo(video!, performance.now()).detections.length;
      const seen: FaceIssue | null =
        faces === 0 ? "NO_FACE" : faces > 1 ? "MULTIPLE_FACES" : null;
      const now = Date.now();

      if (seen !== current.issue) {
        closeCurrent(now);
        current = { issue: seen, since: now, flagged: false };
        setIssue(null);
      } else if (seen && !current.flagged && now - current.since >= FLAG_AFTER_MS) {
        current.flagged = true;
        setIssue(seen);
      }
    }

    createDetector()
      .then((d) => {
        if (cancelled) {
          d.close();
          return;
        }
        detector = d;
        timer = setInterval(tick, CHECK_EVERY_MS);
      })
      .catch(() => {
        if (!cancelled) logInterviewEvent(sessionId, questionRef.current, "FACE_CHECK_UNAVAILABLE");
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
      closeCurrent(Date.now());
      detector?.close();
    };
  }, [video, sessionId]);

  return issue;
}
