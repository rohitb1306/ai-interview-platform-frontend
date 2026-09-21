"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorText, inputClass, primaryButtonClass } from "@/components/admin/ui";
import { adminLogin } from "@/lib/adminApi";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await adminLogin(username, password);
      router.replace("/admin");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not reach the backend. Is it running?"
          : err instanceof Error
            ? err.message
            : "Login failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Recruiter sign in</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Use a staff account (created with{" "}
        <code className="font-mono">createsuperuser</code>).
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm">
          Username
          <input
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} py-3`}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
