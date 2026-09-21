"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { JobForm } from "@/components/admin/JobForm";
import { createJob } from "@/lib/adminApi";

export default function NewJobPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/jobs" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
        ← All roles
      </Link>
      <h1 className="text-2xl font-semibold">New role</h1>
      <JobForm
        submitLabel="Create role"
        onSubmit={async (input) => {
          await createJob(input);
          router.push("/admin/jobs");
        }}
      />
    </div>
  );
}
