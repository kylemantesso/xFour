"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { label: "Introduction", href: "/docs" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "Concepts", href: "/docs/concepts" },
    ],
  },
  {
    title: "Agent SDK",
    items: [
      { label: "Overview", href: "/docs/agent" },
      { label: "Installation", href: "/docs/agent#installation" },
      { label: "Configuration", href: "/docs/agent#configuration" },
      { label: "fetchWithX402", href: "/docs/agent#fetch-with-x402" },
      { label: "Error Handling", href: "/docs/agent#error-handling" },
      { label: "Examples", href: "/docs/agent#examples" },
    ],
  },
  {
    title: "Server SDK",
    items: [
      { label: "Overview", href: "/docs/server" },
      { label: "Installation", href: "/docs/server#installation" },
      { label: "Express Middleware", href: "/docs/server#express" },
      { label: "Next.js Integration", href: "/docs/server#nextjs" },
      { label: "Pricing Strategies", href: "/docs/server#pricing" },
      { label: "Examples", href: "/docs/server#examples" },
    ],
  },
  {
    title: "Reference",
    items: [
      { label: "API Reference", href: "/docs/api" },
      { label: "Error Codes", href: "/docs/api#error-codes" },
    ],
  },
];

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(navigation.map((s) => s.title))
  );

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const isExactActive = (href: string) => {
    return pathname === href.split("#")[0];
  };

  return (
    <nav className="space-y-6">
      {navigation.map((section) => (
        <div key={section.title}>
          <button
            onClick={() => toggleSection(section.title)}
            className="flex items-center justify-between w-full text-left group mb-2"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-[#888] group-hover:text-white transition-colors">
              {section.title}
            </span>
            <ChevronIcon
              className={`w-4 h-4 text-[#666] transition-transform ${
                expandedSections.has(section.title) ? "rotate-180" : ""
              }`}
            />
          </button>

          {expandedSections.has(section.title) && (
            <ul className="space-y-1 border-l border-[#333] ml-1">
              {section.items.map((item) => {
                const active = isExactActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`block pl-4 py-1.5 text-sm transition-colors relative ${
                        active
                          ? "text-white font-medium"
                          : "text-[#888] hover:text-white"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-pink-500 to-violet-500 rounded-full" />
                      )}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}

function ChevronIcon({ className }: { className?: string }) {
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
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

