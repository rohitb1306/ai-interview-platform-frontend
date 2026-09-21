"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ErrorText,
  Muted,
  cardClass,
  formatDate,
  formatScore,
  secondaryButtonClass,
} from "@/components/admin/ui";
import { getSessionReport } from "@/lib/adminApi";
import type { AdminInterviewEvent, AdminSessionReport } from "@/lib/types";

const QUESTION_TYPE_LABELS = {
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  SYSTEM_DESIGN: "System design",
} as const;

const EVENT_LABELS: Record<AdminInterviewEvent["event_type"], string> = {
  FOCUS_LOST: "Left the interview window",
  FOCUS_RETURNED: "Came back",
  FULLSCREEN_EXIT: "Exited full screen",
  RECORDING_ERROR: "Recording upload failed",
  NO_FACE: "No face on camera",
  MULTIPLE_FACES: "More than one person on camera",
  CAMERA_LOST: "Camera or microphone disconnected",
  FACE_CHECK_UNAVAILABLE: "Face checks couldn't run on this device",
};

// Events where duration_ms means how long the problem lasted (vs. time away).
const LASTED_EVENTS = new Set(["NO_FACE", "MULTIPLE_FACES"]);

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          warn ? "text-red-600 dark:text-red-400" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SkillList({ label, skills, tone }: { label: string; skills: string[]; tone: "positive" | "negative" }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {skills.length === 0 && <span className="text-sm text-neutral-500">None</span>}
        {skills.map((skill) => (
          <span
            key={skill}
            className={`rounded-full px-2.5 py-1 text-xs ${
              tone === "positive"
                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminSessionReportPage() {
  const params = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<AdminSessionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSessionReport(params.sessionId)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load report."));
  }, [params.sessionId]);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!report) return <Muted>Loading...</Muted>;

  const questionNumber = new Map(report.qa_pairs.map((qa, i) => [qa.id, i + 1]));
  const leaves = report.events.filter((e) => e.event_type === "FOCUS_LOST");
  const timeAway = report.events
    .filter((e) => e.event_type === "FOCUS_RETURNED")
    .reduce((sum, e) => sum + (e.duration_ms ?? 0), 0);
  const fullscreenExits = report.events.filter((e) => e.event_type === "FULLSCREEN_EXIT").length;
  const recordingErrors = report.events.filter((e) => e.event_type === "RECORDING_ERROR").length;
  const faceIssues = report.events.filter((e) => LASTED_EVENTS.has(e.event_type));
  const flagged = report.events.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={`/admin/applications/${report.application_id}`}
        className="text-sm text-neutral-600 hover:underline print:hidden dark:text-neutral-400"
      >
        ← {report.candidate_name}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Interview report</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {report.candidate_name} ({report.candidate_email}) · {report.job_title}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Started {formatDate(report.started_at)} ·{" "}
            {report.completed_at ? `Completed ${formatDate(report.completed_at)}` : "Not finished"}
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className={`${secondaryButtonClass} print:hidden`}>
          Download / print
        </button>
      </div>

      <section className={`${cardClass} grid grid-cols-2 gap-6 sm:grid-cols-5`}>
        <Stat label="Interview score" value={formatScore(report.overall_score)} />
        <Stat label="Resume match" value={formatScore(report.match_score)} />
        <Stat label="Left the window" value={`${leaves.length}×`} warn={leaves.length > 0} />
        <Stat label="Total time away" value={formatDuration(timeAway)} warn={timeAway > 0} />
        <Stat label="Face issues" value={`${faceIssues.length}×`} warn={faceIssues.length > 0} />
      </section>

      {report.final_feedback && (
        <section className={cardClass}>
          <p className="text-xs font-medium text-neutral-500">AI summary</p>
          <p className="mt-1.5 text-sm">{report.final_feedback}</p>
        </section>
      )}

      {report.gap_analysis && (
        <section className={`${cardClass} flex flex-col gap-4`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SkillList label="Matched skills" skills={report.gap_analysis.matched_skills} tone="positive" />
            <SkillList label="Missing skills" skills={report.gap_analysis.missing_skills} tone="negative" />
          </div>
          {report.gap_analysis.missing_context && (
            <Muted>{report.gap_analysis.missing_context}</Muted>
          )}
        </section>
      )}

      <section className={`${cardClass} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Integrity log</h2>
          <p className="text-xs text-neutral-500">
            {fullscreenExits} full-screen exit{fullscreenExits === 1 ? "" : "s"} ·{" "}
            {recordingErrors} recording error{recordingErrors === 1 ? "" : "s"}
          </p>
        </div>
        {!flagged ? (
          <Muted>Nothing flagged: no tab switches, full-screen exits, face or recording issues.</Muted>
        ) : (
          <ol className="flex flex-col gap-2 text-sm">
            {report.events.map((event) => (
              <li key={event.id} className="flex flex-wrap gap-x-3">
                <span className="tabular-nums text-neutral-500">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
                <span
                  className={
                    event.event_type === "FOCUS_RETURNED" ? "" : "text-red-700 dark:text-red-400"
                  }
                >
                  {EVENT_LABELS[event.event_type]}
                  {event.duration_ms !== null &&
                    (LASTED_EVENTS.has(event.event_type)
                      ? ` for ${formatDuration(event.duration_ms)}`
                      : ` after ${formatDuration(event.duration_ms)} away`)}
                </span>
                {event.qa_id && questionNumber.has(event.qa_id) && (
                  <span className="text-neutral-500">during Q{questionNumber.get(event.qa_id)}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Questions, answers & recordings</h2>
        {report.qa_pairs.map((qa, i) => {
          const leftDuring = leaves.filter((e) => e.qa_id === qa.id).length;
          const faceDuring = faceIssues.filter((e) => e.qa_id === qa.id).length;
          return (
            <div key={qa.id} className={`${cardClass} flex flex-col gap-3 text-sm`}>
              <div className="flex items-start justify-between gap-4">
                <p className="font-medium">
                  Q{i + 1}. {qa.question_text}
                </p>
                <span className="shrink-0 text-lg font-semibold tabular-nums">
                  {formatScore(qa.evaluation_score)}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {QUESTION_TYPE_LABELS[qa.question_type]}
                {leftDuring > 0 && (
                  <span className="text-red-700 dark:text-red-400">
                    {" "}· left the window {leftDuring}× during this question
                  </span>
                )}
                {faceDuring > 0 && (
                  <span className="text-red-700 dark:text-red-400">
                    {" "}· {faceDuring} face issue{faceDuring === 1 ? "" : "s"}
                  </span>
                )}
              </p>

              <div>
                <p className="text-xs font-medium text-neutral-500">Answer</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {qa.candidate_answer_text ?? <span className="text-neutral-500">Not answered</span>}
                </p>
              </div>
              {qa.ai_feedback && (
                <div>
                  <p className="text-xs font-medium text-neutral-500">AI feedback</p>
                  <p className="mt-1">{qa.ai_feedback}</p>
                </div>
              )}

              <div className="print:hidden">
                <p className="text-xs font-medium text-neutral-500">Recording</p>
                {qa.recordings.length === 0 ? (
                  <p className="mt-1 text-neutral-500">No recording</p>
                ) : (
                  <div className="mt-1.5 flex flex-col gap-2">
                    {qa.recordings.map((rec, j) => (
                      <div key={rec.id}>
                        {qa.recordings.length > 1 && (
                          <p className="text-xs text-neutral-500">
                            Part {j + 1} · {formatDate(rec.created_at)}
                          </p>
                        )}
                        {rec.content_type.startsWith("video/") ? (
                          <video
                            controls
                            preload="metadata"
                            src={rec.url}
                            className="w-full max-w-md rounded-lg bg-black"
                          />
                        ) : (
                          <audio controls preload="none" src={rec.url} className="w-full" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
