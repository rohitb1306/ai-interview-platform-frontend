"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { clearAdminSession, getMe, hasAdminSession } from "@/lib/adminApi";
import type { StaffUser } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/jobs", label: "Roles" },
  { href: "/admin/applications", label: "Applications" },
];

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [user, setUser] = useState<StaffUser | null>(null);
  const isAuthed = useSyncExternalStore(subscribeToStorage, hasAdminSession, () => false);

  useEffect(() => {
    if (isLoginPage) return;
    if (!hasAdminSession()) {
      router.replace("/admin/login");
      return;
    }
    getMe().then(setUser).catch(() => {});
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;
  if (!isAuthed) return null;

  function logout() {
    clearAdminSession();
    router.replace("/admin/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <Link href="/admin" className="font-semibold">
            Recruiter
          </Link>
          <nav className="flex gap-1 text-sm">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 transition ${
                    active
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user && (
              <span className="text-neutral-600 dark:text-neutral-400">
                {user.username}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-neutral-300 px-3 py-1.5 transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
