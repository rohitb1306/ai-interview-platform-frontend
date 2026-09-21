"use client";

import { useRouter } from "next/navigation";

import type { AdminApplication } from "@/lib/types";

import { Muted, StatusBadge, formatDate, formatScore } from "./ui";

export function ApplicationsTable({
  applications,
}: {
  applications: AdminApplication[];
}) {
  const router = useRouter();

  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
        <Muted>No applications yet.</Muted>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-800">
          <tr>
            <th className="px-4 py-3 font-medium">Candidate</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Resume match</th>
            <th className="px-4 py-3 text-right font-medium">Interview</th>
            <th className="px-4 py-3 font-medium">Applied</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr
              key={app.id}
              onClick={() => router.push(`/admin/applications/${app.id}`)}
              className="cursor-pointer border-b border-neutral-100 transition last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900"
            >
              <td className="px-4 py-3">
                <p className="font-medium">{app.candidate_name}</p>
                <p className="text-xs text-neutral-500">{app.candidate_email}</p>
              </td>
              <td className="px-4 py-3">{app.job_title}</td>
              <td className="px-4 py-3">
                <StatusBadge status={app.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatScore(app.match_score)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatScore(app.interview_score)}
              </td>
              <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                {formatDate(app.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
