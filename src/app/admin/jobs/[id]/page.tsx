"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { JobForm } from "@/components/admin/JobForm";
import { ErrorText, Muted, dangerButtonClass } from "@/components/admin/ui";
import { deleteJob, getAdminJob, updateJob } from "@/lib/adminApi";
import type { AdminJob } from "@/lib/types";

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<AdminJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getAdminJob(params.id)
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load role."));
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Delete this role? This can't be undone.")) return;
    setDeleteError(null);
    try {
      await deleteJob(params.id);
      router.push("/admin/jobs");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete role.");
    }
  }

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!job) return <Muted>Loading...</Muted>;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/jobs" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
        ← All roles
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Edit role</h1>
        <button
          type="button"
          onClick={handleDelete}
          disabled={job.application_count > 0}
          title={job.application_count > 0 ? "Roles with applications can't be deleted" : undefined}
          className={dangerButtonClass}
        >
          Delete role
        </button>
      </div>
      {deleteError && <ErrorText>{deleteError}</ErrorText>}
      <JobForm
        initial={job}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          await updateJob(params.id, input);
          router.push("/admin/jobs");
        }}
      />
    </div>
  );
}
