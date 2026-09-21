import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold sm:text-4xl">
        AI Interview Platform
      </h1>
      <p className="max-w-md text-neutral-600 dark:text-neutral-400">
        Apply for a role, get screened automatically, and — if you&apos;re a
        match — complete a short AI-driven interview right here.
      </p>
      <Link
        href="/apply"
        className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Apply for a role
      </Link>
    </main>
  );
}
