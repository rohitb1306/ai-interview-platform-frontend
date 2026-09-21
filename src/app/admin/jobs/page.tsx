"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ErrorText, Muted, cardClass, primaryButtonClass } from "@/components/admin/ui";
import { listAdminJobs } from "@/lib/adminApi";
import type { AdminJob } from "@/lib/types";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminJobs()
      .then(setJobs)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load roles."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <Link href="/admin/jobs/new" className={primaryButtonClass}>
          New role
        </Link>
      </div>

      {error ? (
        <ErrorText>{error}</ErrorText>
      ) : jobs === null ? (
        <Muted>Loading...</Muted>
      ) : jobs.length === 0 ? (
        <Muted>No roles yet. Create one so candidates can apply.</Muted>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <div key={job.id} className={`${cardClass} flex flex-col gap-3`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/admin/jobs/${job.id}`} className="font-semibold hover:underline">
                    {job.title}
                  </Link>
                  {job.department && (
                    <p className="text-sm text-neutral-500">{job.department}</p>
                  )}
                </div>
                <Link
                  href={`/admin/applications?job=${job.id}`}
                  className="shrink-0 text-sm text-neutral-600 hover:underline dark:text-neutral-400"
                >
                  {job.application_count} application{job.application_count === 1 ? "" : "s"} →
                </Link>
              </div>
              <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                {job.raw_jd_text}
              </p>
              {job.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {job.required_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
