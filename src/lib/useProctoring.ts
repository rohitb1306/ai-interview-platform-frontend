"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { logInterviewEvent } from "./api";

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

const isFullscreenNow = () => !!document.fullscreenElement;
// Unsupported (e.g. iPhone Safari) → don't gate on full screen.
const fullscreenSupported = () => !!document.fullscreenEnabled;

export function requestInterviewFullscreen() {
  if (document.fullscreenEnabled && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

/**
 * Browsers can't stop a candidate from switching tabs, so this detects it instead:
 * logs each time focus leaves the interview (and for how long), logs full screen
 * exits, and exposes state the page uses to block the interview until they return.
 */
export function useProctoring(sessionId: string | null, questionId: string | null) {
  const isFullscreen = useSyncExternalStore(subscribeFullscreen, isFullscreenNow, () => true);
  const supportsFullscreen = useSyncExternalStore(subscribeFullscreen, fullscreenSupported, () => false);
  const [timesLeft, setTimesLeft] = useState(0);
  const [showReturnWarning, setShowReturnWarning] = useState(false);

  const questionRef = useRef(questionId);
  useEffect(() => {
    questionRef.current = questionId;
  }, [questionId]);

  useEffect(() => {
    if (!sessionId) return;
    let awaySince: number | null = null;

    function check() {
      const away = document.hidden || !document.hasFocus();
      if (away && awaySince === null) {
        awaySince = Date.now();
        logInterviewEvent(sessionId!, questionRef.current, "FOCUS_LOST");
        setTimesLeft((n) => n + 1);
      } else if (!away && awaySince !== null) {
        logInterviewEvent(sessionId!, questionRef.current, "FOCUS_RETURNED", Date.now() - awaySince);
        awaySince = null;
        setShowReturnWarning(true);
      }
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        logInterviewEvent(sessionId!, questionRef.current, "FULLSCREEN_EXIT");
      }
    }

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    document.addEventListener("visibilitychange", check);
    window.addEventListener("blur", check);
    window.addEventListener("focus", check);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("blur", check);
      window.removeEventListener("focus", check);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [sessionId]);

  return {
    mustEnterFullscreen: supportsFullscreen && !isFullscreen,
    timesLeft,
    showReturnWarning,
    dismissReturnWarning: () => setShowReturnWarning(false),
  };
}
