"use client";

import Link from "next/link";

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

export function BackToDashboard() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors group"
    >
      <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      Back to Dashboard
    </Link>
  );
}


