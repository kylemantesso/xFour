"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userData = useQuery(api.users.getCurrentUser);
  const setCurrentWorkspace = useMutation(api.users.setCurrentWorkspace);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!userData) {
    return (
      <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
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
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-all duration-200 min-w-[180px]"
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          {currentWorkspace?.name?.charAt(0).toUpperCase() || "W"}
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1 text-left">
          {currentWorkspace?.name || "Select Workspace"}
        </span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Workspaces List */}
          <div className="p-2 max-h-64 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1">
              Your Workspaces
            </p>
            {workspaces && workspaces.length > 0 ? (
              workspaces.map((workspace) => (
                <button
                  key={workspace?._id}
                  onClick={() => workspace && handleSwitchWorkspace(workspace._id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                    workspace?._id === currentWorkspace?._id
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                      : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {workspace?.name?.charAt(0).toUpperCase() || "W"}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium truncate">{workspace?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {workspace?.role}
                    </p>
                  </div>
                  {workspace?._id === currentWorkspace?._id && (
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 px-3 py-2">
                No workspaces found
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-600" />

          {/* Create New Workspace */}
          <div className="p-2">
            {isCreating ? (
              <form onSubmit={handleCreateWorkspace} className="p-2">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewWorkspaceName("");
                    }}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create new workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


