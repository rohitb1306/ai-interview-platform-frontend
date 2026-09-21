"use client";

import { useEffect } from "react";

export default function InterviewCompletePage() {
  useEffect(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 p-8 text-center dark:border-neutral-800">
        <h1 className="text-xl font-semibold">Thank you!</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          Your interview has been submitted. The hiring team will review it and get
          back to you by email. You can close this tab now.
        </p>
      </div>
    </main>
  );
}
