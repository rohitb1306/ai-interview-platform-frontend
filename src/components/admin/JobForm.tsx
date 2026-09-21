"use client";

import { useState } from "react";

import type { AdminJobInput } from "@/lib/types";

import { ErrorText, inputClass, primaryButtonClass } from "./ui";

export function JobForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: AdminJobInput;
  submitLabel: string;
  onSubmit: (input: AdminJobInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [skills, setSkills] = useState((initial?.required_skills ?? []).join(", "));
  const [description, setDescription] = useState(initial?.raw_jd_text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title,
        department,
        raw_jd_text: description,
        required_skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save role.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          Title
          <input
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Department
          <input
            maxLength={50}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        Required skills
        <input
          placeholder="Python, Django, PostgreSQL"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-neutral-500">
          Comma-separated. Used for the 40% skill-coverage part of the match score.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Job description
        <textarea
          required
          rows={12}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-neutral-500">
          Resumes are compared against this text, and the AI uses it to write interview
          questions.
        </span>
      </label>
      {error && <ErrorText>{error}</ErrorText>}
      <div>
        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
