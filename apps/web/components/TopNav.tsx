"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const navItems: { label: string; href: string; highlight?: boolean }[] = [
  { label: "Overview", href: "/" },
  { label: "Agents", href: "/workspace/agents" },
  { label: "Providers", href: "/workspace/providers" },
  { label: "Treasury", href: "/workspace/treasury" },
  { label: "Activity", href: "/workspace/activity" },
  { label: "Settings", href: "/workspace/settings" },
  { label: "SDK Demo", href: "/sdk-demo", highlight: true },
];

export function TopNav() {
  return (
    <header className="flex flex-col border-b border-[#333] bg-[#0a0a0a]">
      {/* Top row */}
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">
              x4
            </div>
          </Link>

          <SignedIn>
            {/* Separator */}
            <SlashSeparator />

            {/* Workspace Switcher */}
            <WorkspaceDropdown />
          </SignedIn>
        </div>

        <div className="flex items-center gap-2">
          <SignedIn>
            {/* Search */}
            <SearchButton />

            {/* Feedback */}
            <button className="px-3 py-1.5 text-sm text-[#888] hover:text-white border border-[#333] hover:border-[#555] rounded-md transition-colors">
              Feedback
            </button>

            {/* Notifications */}
            <button className="p-2 text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors">
              <BellIcon className="w-4 h-4" />
            </button>

            {/* Docs */}
            <button className="p-2 text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors">
              <BookIcon className="w-4 h-4" />
            </button>

            {/* User */}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                variables: {
                  colorText: "#ffffff",
                  colorTextSecondary: "#ffffff",
                },
                elements: {
                  avatarBox: "w-7 h-7",
                  userButtonTrigger: "focus:shadow-none",
                  userButtonPopoverCard: "bg-[#111] border border-[#333] [&_*]:text-white",
                  userButtonPopoverMain: "text-white [&_*]:text-white",
                  userButtonPopoverIdentity: "text-white [&_*]:text-white",
                  userButtonPopoverIdentityText: "text-white [&_*]:text-white",
                  userButtonPopoverActions: "text-white [&_*]:text-white",
                  userButtonPopoverActionButton: "text-white hover:text-white hover:bg-[#1a1a1a] [&_*]:text-white",
                  userButtonPopoverActionButtonText: "!text-white",
                  userButtonPopoverActionButtonIcon: "text-white",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
          </SignedIn>

          <SignedOut>
            <Link
              href="/docs"
              className="px-4 py-1.5 text-sm text-[#888] hover:text-white transition-colors"
            >
              Docs
            </Link>
            <SignInButton>
              <button className="px-4 py-1.5 text-sm text-[#888] hover:text-white transition-colors">
                Log In
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="px-4 py-1.5 text-sm text-black bg-white hover:bg-gray-200 rounded-md transition-colors font-medium">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
        </div>
      </div>

      {/* Navigation row */}
      <SignedIn>
        <NavTabs />
      </SignedIn>
    </header>
  );
}

function NavTabs() {
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);
  const isAdmin = currentUser?.user?.isAdmin ?? false;

  return (
    <nav className="flex items-center px-4 -mb-px overflow-x-auto scrollbar-hide">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative px-3 py-3 text-sm transition-colors whitespace-nowrap ${
              isActive
                ? "text-white"
                : item.highlight
                ? "text-violet-400 hover:text-violet-300"
                : "text-[#888] hover:text-white"
            }`}
          >
            {item.label}
            {item.highlight && !isActive && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-violet-600 text-white rounded">
                NEW
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
            )}
          </Link>
        );
      })}
      
      {/* Admin Link - only shown to platform admins */}
      {isAdmin && (
        <Link
          href="/admin"
          className={`relative px-3 py-3 text-sm transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            pathname.startsWith("/admin")
              ? "text-white"
              : "text-amber-400 hover:text-amber-300"
          }`}
        >
          <ShieldIcon className="w-3.5 h-3.5" />
          Admin
          {pathname.startsWith("/admin") && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
          )}
        </Link>
      )}
    </nav>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function WorkspaceDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userData = useQuery(api.users.getCurrentUser);
  const setCurrentWorkspace = useMutation(api.users.setCurrentWorkspace);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!userData) {
    return (
      <div className="h-7 w-32 bg-[#1a1a1a] rounded animate-pulse" />
    );
  }

  const { currentWorkspace, workspaces } = userData;

  const handleSwitchWorkspace = async (workspaceId: Id<"workspaces">) => {
    await setCurrentWorkspace({ workspaceId });
    setIsOpen(false);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    await createWorkspace({ name: newWorkspaceName.trim() });
    setNewWorkspaceName("");
    setIsCreating(false);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#1a1a1a] transition-colors group"
      >
        {/* Workspace Icon */}
        <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">
            {currentWorkspace?.name?.charAt(0).toUpperCase() || "W"}
          </span>
        </div>

        {/* Workspace Name */}
        <span className="text-sm text-white font-medium max-w-[120px] truncate">
          {currentWorkspace?.name || "Workspace"}
        </span>

        {/* Pro Badge */}
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded">
          Pro
        </span>

        {/* Chevron */}
        <ChevronIcon
          className={`w-4 h-4 text-[#666] group-hover:text-[#888] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-[#0a0a0a] border border-[#333] rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="p-2 max-h-64 overflow-y-auto">
            <p className="text-[11px] font-medium text-[#666] uppercase tracking-wider px-2 py-1.5">
              Workspaces
            </p>
            {workspaces && workspaces.length > 0 ? (
              workspaces.map((workspace) => (
                <button
                  key={workspace?._id}
                  onClick={() =>
                    workspace && handleSwitchWorkspace(workspace._id)
                  }
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors ${
                    workspace?._id === currentWorkspace?._id
                      ? "bg-[#1a1a1a]"
                      : "hover:bg-[#1a1a1a]"
                  }`}
                >
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">
                      {workspace?.name?.charAt(0).toUpperCase() || "W"}
                    </span>
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm text-white truncate">
                      {workspace?.name}
                    </p>
                    <p className="text-xs text-[#666] capitalize">
                      {workspace?.role}
                    </p>
                  </div>
                  {workspace?._id === currentWorkspace?._id && (
                    <CheckIcon className="w-4 h-4 text-white" />
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-[#666] px-2 py-2">
                No workspaces found
              </p>
            )}
          </div>

          <div className="h-px bg-[#333]" />

          <div className="p-2">
            {isCreating ? (
              <form onSubmit={handleCreateWorkspace} className="p-2">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name..."
                  className="w-full px-3 py-2 text-sm border border-[#333] rounded-md bg-[#0a0a0a] text-white placeholder-[#666] focus:outline-none focus:border-[#555]"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewWorkspaceName("");
                    }}
                    className="flex-1 px-3 py-1.5 text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] rounded-md transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Create workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchButton() {
  return (
    <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#666] bg-[#0a0a0a] border border-[#333] hover:border-[#555] rounded-md transition-colors min-w-[180px]">
      <SearchIcon className="w-4 h-4" />
      <span className="flex-1 text-left">Find...</span>
      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#1a1a1a] border border-[#333] rounded">
        F
      </kbd>
    </button>
  );
}

// Icons
function SlashSeparator() {
  return (
    <span className="text-[#333] text-2xl font-light select-none">/</span>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}


