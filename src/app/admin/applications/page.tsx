"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ApplicationsTable } from "@/components/admin/ApplicationsTable";
import { ErrorText, Muted, STATUS_LABELS, inputClass } from "@/components/admin/ui";
import { listAdminJobs, listApplications } from "@/lib/adminApi";
import type { AdminApplication, AdminJob, ApplicationStatus } from "@/lib/types";

function ApplicationsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const job = searchParams.get("job") ?? "";
  const status = (searchParams.get("status") ?? "") as ApplicationStatus | "";
  const q = searchParams.get("q") ?? "";

  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [applications, setApplications] = useState<AdminApplication[] | null>(null);
  const [search, setSearch] = useState(q);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminJobs().then(setJobs).catch(() => {});
  }, []);

  useEffect(() => {
    listApplications({ job, status, q })
      .then(setApplications)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load applications.")
      );
  }, [job, status, q]);

  // Debounce the search box into the URL.
  useEffect(() => {
    if (search === q) return;
    const id = setTimeout(() => setFilter("q", search), 300);
    return () => clearTimeout(id);
  });

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Applications</h1>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} min-w-56 flex-1`}
        />
        <select value={job} onChange={(e) => setFilter("job", e.target.value)} className={inputClass}>
          <option value="">All roles</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setFilter("status", e.target.value)}
          className={inputClass}
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorText>{error}</ErrorText>
      ) : applications === null ? (
        <Muted>Loading...</Muted>
      ) : (
        <ApplicationsTable applications={applications} />
      )}
    </div>
  );
}

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<Muted>Loading...</Muted>}>
      <ApplicationsList />
    </Suspense>
  );
}
