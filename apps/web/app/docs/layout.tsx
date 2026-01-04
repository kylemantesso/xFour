"use client";

import { useState } from "react";
import Link from "next/link";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-4 px-4 py-3 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#333]">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <Link href="/docs" className="text-sm font-medium text-white">
          Documentation
        </Link>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute top-0 left-0 bottom-0 w-72 bg-[#0a0a0a] border-r border-[#333] p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">
                  x4
                </div>
                <span className="text-sm font-medium text-white">Docs</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r border-[#333]">
          <div className="sticky top-0 h-screen overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-8">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">
                  x4
                </div>
                <span className="text-sm font-medium text-[#888] group-hover:text-white transition-colors">
                  x402 Gateway
                </span>
              </Link>
              <span className="text-[#333]">/</span>
              <span className="text-sm font-medium text-white">Docs</span>
            </div>
            <DocsSidebar />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 py-12 lg:px-12">
            {children}
          </div>
        </main>

        {/* Right sidebar for table of contents - placeholder for future */}
        <aside className="hidden xl:block w-56 flex-shrink-0">
          {/* Table of contents could go here */}
        </aside>
      </div>
    </div>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

