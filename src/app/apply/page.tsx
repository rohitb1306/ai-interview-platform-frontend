"use client";

import { useEffect, useState } from "react";

import { applyToJob, listJobs } from "@/lib/api";
import type { JobPosition } from "@/lib/types";

const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function validateFile(file: File): string | null {
  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return "Resume must be a .pdf or .docx file.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Resume must be 5MB or smaller.";
  }
  return null;
}

export default function ApplyPage() {
  const [jobs, setJobs] = useState<JobPosition[]>([]);
  const [jobId, setJobId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    listJobs()
      .then((data) => {
        setJobs(data);
        if (data.length > 0) setJobId(data[0].id);
      })
      .catch(() => setSubmitError("Could not load open roles. Is the backend running?"));
  }, []);

  function handleFile(candidate: File | null) {
    if (!candidate) {
      setFile(null);
      setFileError(null);
      return;
    }
    const error = validateFile(candidate);
    setFileError(error);
    setFile(error ? null : candidate);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !jobId) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append("full_name", fullName);
      formData.append("email", email);
      formData.append("job_id", jobId);
      formData.append("resume_file", file);
      await applyToJob(formData);
      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-full rounded-2xl border border-neutral-200 p-8 dark:border-neutral-800">
          <h1 className="text-xl font-semibold">Application Received!</h1>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            We are analyzing your profile. If it matches the criteria, check
            your email inbox for your interview access link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Apply for a role</h1>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm">
          Role
          <select
            required
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
          >
            {jobs.length === 0 && <option value="">Loading roles...</option>}
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} {job.department ? `— ${job.department}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Full name
          <input
            required
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          Resume (PDF or DOCX, max 5MB)
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
              isDragging
                ? "border-neutral-500 bg-neutral-50 dark:bg-neutral-900"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            <input
              id="resume-input"
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="resume-input"
              className="cursor-pointer text-neutral-600 dark:text-neutral-400"
            >
              {file ? file.name : "Drop a file here, or click to browse"}
            </label>
          </div>
          {fileError && <p className="text-red-600">{fileError}</p>}
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !file || !jobId}
          className="mt-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {isSubmitting ? "Submitting..." : "Submit application"}
        </button>
      </form>
    </main>
  );
}
