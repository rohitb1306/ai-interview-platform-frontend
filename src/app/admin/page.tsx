"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ApplicationsTable } from "@/components/admin/ApplicationsTable";
import {
  ErrorText,
  Muted,
  STATUS_LABELS,
  StatusBadge,
  cardClass,
  formatScore,
} from "@/components/admin/ui";
import { getStats } from "@/lib/adminApi";
import type { AdminStats, ApplicationStatus } from "@/lib/types";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load stats."));
  }, []);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!stats) return <Muted>Loading...</Muted>;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open roles" value={stats.total_jobs} />
        <StatCard label="Applications" value={stats.total_applications} />
        <StatCard label="Avg. resume match" value={formatScore(stats.avg_match_score)} />
        <StatCard
          label={`Avg. interview score (${stats.completed_interviews} done)`}
          value={formatScore(stats.avg_interview_score)}
        />
      </div>

      <div className={cardClass}>
        <p className="text-xs font-medium text-neutral-500">Pipeline</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((status) => (
            <Link
              key={status}
              href={`/admin/applications?status=${status}`}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 transition hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <StatusBadge status={status} />
              <span className="text-sm font-medium tabular-nums">
                {stats.by_status[status]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent applications</h2>
          <Link href="/admin/applications" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            View all →
          </Link>
        </div>
        <ApplicationsTable applications={stats.recent_applications} />
      </div>
    </div>
  );
}
