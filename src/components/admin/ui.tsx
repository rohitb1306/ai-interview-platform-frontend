import type { ApplicationStatus } from "@/lib/types";

export const inputClass =
  "rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";

export const primaryButtonClass =
  "rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200";

export const secondaryButtonClass =
  "rounded-full border border-neutral-300 px-5 py-2 text-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900";

export const dangerButtonClass =
  "rounded-full border border-red-300 px-5 py-2 text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950";

export const cardClass =
  "rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  SCREENING: "Screening",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Rejected",
  INTERVIEW_IN_PROGRESS: "Interviewing",
  COMPLETED: "Completed",
};

const STATUS_TONES: Record<ApplicationStatus, string> = {
  PENDING: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  SCREENING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  SHORTLISTED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  INTERVIEW_IN_PROGRESS:
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${STATUS_TONES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function formatScore(score: number | null): string {
  return score === null ? "—" : `${Math.round(score)}%`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-red-600">{children}</p>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-neutral-600 dark:text-neutral-400">{children}</p>
  );
}
