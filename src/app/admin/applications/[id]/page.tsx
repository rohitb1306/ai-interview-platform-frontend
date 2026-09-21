"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ErrorText,
  Muted,
  StatusBadge,
  cardClass,
  dangerButtonClass,
  formatDate,
  formatScore,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/admin/ui";
import { applicationAction, getApplication } from "@/lib/adminApi";
import type { AdminApplicationDetail, AdminInterviewSession } from "@/lib/types";

type Action = "shortlist" | "reject" | "rescreen";

function SkillList({
  label,
  skills,
  tone,
}: {
  label: string;
  skills: string[];
  tone: "positive" | "negative";
}) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      {skills.length === 0 ? (
        <p className="mt-1.5 text-sm text-neutral-500">None</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
      )}
    </div>
  );
}

function InviteLinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
      <p className="text-sm font-medium">Interview link sent</p>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        Also printed in the backend terminal (console email). Valid for 48 hours; reopening it resumes an unfinished interview.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs dark:bg-neutral-900">
          {url}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
          }}
          className={secondaryButtonClass}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
          Open
        </a>
      </div>
    </div>
  );
}

function SessionCard({ session, index }: { session: AdminInterviewSession; index: number }) {
  const flags =
    session.focus_lost_count + session.fullscreen_exit_count + session.face_flag_count;
  return (
    <div className={`${cardClass} flex flex-wrap items-center justify-between gap-4`}>
      <div>
        <p className="font-medium">Interview #{index}</p>
        <p className="mt-1 text-xs text-neutral-500">
          Started {formatDate(session.started_at)} ·{" "}
          {session.completed_at
            ? `Completed ${formatDate(session.completed_at)}`
            : `In progress (${session.answered_count} answered)`}
        </p>
        <p
          className={`mt-1 text-xs ${
            flags > 0 ? "text-red-700 dark:text-red-400" : "text-neutral-500"
          }`}
        >
          Left the window {session.focus_lost_count}× · exited full screen{" "}
          {session.fullscreen_exit_count}× · face issues {session.face_flag_count}×
        </p>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-3xl font-semibold tabular-nums">{formatScore(session.overall_score)}</p>
        <Link href={`/admin/reports/${session.id}`} className={primaryButtonClass}>
          View report
        </Link>
      </div>
    </div>
  );
}

export default function AdminApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [app, setApp] = useState<AdminApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    getApplication(params.id)
      .then(setApp)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load application."));
  }, [params.id]);

  async function run(action: Action) {
    if (action === "reject" && !confirm("Reject this candidate and email them?")) return;
    setPending(action);
    setActionError(null);
    try {
      const updated = await applicationAction(params.id, action);
      setApp(updated);
      setInviteUrl(updated.interview_url ?? null);
    } catch (err) {
      setActionError(
        err instanceof TypeError
          ? "Request failed. If re-screening, make sure Redis is running."
          : err instanceof Error
            ? err.message
            : "Action failed."
      );
    } finally {
      setPending(null);
    }
  }

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!app) return <Muted>Loading...</Muted>;

  const interviewStarted =
    app.status === "INTERVIEW_IN_PROGRESS" || app.status === "COMPLETED";

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin/applications"
        className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
      >
        ← All applications
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{app.candidate_name}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {app.candidate_email} · {app.job_title} · Applied {formatDate(app.created_at)}
          </p>
          {app.active_invite_expires_at && (
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
              Interview link active until {formatDate(app.active_invite_expires_at)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending !== null || app.status === "COMPLETED"}
            onClick={() => run("shortlist")}
            className={primaryButtonClass}
          >
            {pending === "shortlist"
              ? "Sending..."
              : app.status === "SHORTLISTED" || app.status === "INTERVIEW_IN_PROGRESS"
                ? "Resend interview link"
                : "Shortlist & send link"}
          </button>
          <button
            type="button"
            disabled={pending !== null || app.status === "REJECTED" || app.status === "INTERVIEW_IN_PROGRESS"}
            onClick={() => run("reject")}
            className={dangerButtonClass}
          >
            {pending === "reject" ? "Rejecting..." : "Reject"}
          </button>
          <button
            type="button"
            disabled={pending !== null || interviewStarted}
            onClick={() => run("rescreen")}
            className={secondaryButtonClass}
          >
            {pending === "rescreen" ? "Queuing..." : "Re-run AI screening"}
          </button>
        </div>
      </div>

      {actionError && <ErrorText>{actionError}</ErrorText>}
      {inviteUrl && <InviteLinkBox url={inviteUrl} />}

      <section className={`${cardClass} flex flex-col gap-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Resume screening</h2>
            <p className="mt-1 text-xs text-neutral-500">
              60% semantic similarity + 40% required-skill coverage
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums">{formatScore(app.match_score)}</p>
            {app.resume_url && (
              <a
                href={app.resume_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-neutral-600 hover:underline dark:text-neutral-400"
              >
                Open resume ↗
              </a>
            )}
          </div>
        </div>

        {app.gap_analysis ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <SkillList label="Matched skills" skills={app.gap_analysis.matched_skills} tone="positive" />
              <SkillList label="Missing skills" skills={app.gap_analysis.missing_skills} tone="negative" />
            </div>
            {app.gap_analysis.missing_context && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {app.gap_analysis.missing_context}
              </p>
            )}
          </>
        ) : (
          <Muted>
            Not screened yet. Screening needs the Celery worker, Redis, and an LLM API key —
            or shortlist manually above.
          </Muted>
        )}

        {app.extracted_text && (
          <details className="text-sm">
            <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
              Extracted resume text
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 font-mono text-xs dark:bg-neutral-900">
              {app.extracted_text}
            </pre>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Interviews</h2>
        {app.sessions.length === 0 ? (
          <Muted>No interview taken yet.</Muted>
        ) : (
          app.sessions.map((session, i) => (
            <SessionCard key={session.id} session={session} index={app.sessions.length - i} />
          ))
        )}
      </section>
    </div>
  );
}
