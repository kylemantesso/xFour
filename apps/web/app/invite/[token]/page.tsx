"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const inviteData = useQuery(api.invites.getInviteByToken, { token });
  const acceptInvite = useMutation(api.invites.acceptInvite);
  const ensureUserAndWorkspace = useMutation(api.users.ensureUserAndWorkspace);

  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Ensure user exists in Convex when they're logged in
  useEffect(() => {
    if (clerkLoaded && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
      const name = clerkUser.fullName ?? clerkUser.firstName ?? undefined;
      ensureUserAndWorkspace({ email, name }).catch(console.error);
    }
  }, [clerkLoaded, clerkUser, ensureUserAndWorkspace]);

  const handleAcceptInvite = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const result = await acceptInvite({ token });
      setSuccess(true);
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setIsAccepting(false);
    }
  };

  // Loading state
  if (inviteData === undefined || !clerkLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    );
  }

  // Error state
  if (inviteData.error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#111] rounded-2xl border border-[#333] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Invalid Invite
          </h1>
          <p className="text-[#888] mb-6">
            {inviteData.error}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#111] rounded-2xl border border-[#333] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Welcome to {inviteData.invite?.workspaceName}!
          </h1>
          <p className="text-[#888]">
            Redirecting you to the dashboard...
          </p>
        </div>
      </div>
    );
  }

  const invite = inviteData.invite;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-[#111] rounded-2xl border border-[#333] p-8 max-w-md w-full">
        {/* Workspace Icon */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
          {invite?.workspaceName?.charAt(0).toUpperCase() || "W"}
        </div>

        <h1 className="text-xl font-bold text-white text-center mb-2">
          You&apos;ve been invited to join
        </h1>
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {invite?.workspaceName}
        </h2>

        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-6">
          <p className="text-sm text-[#888] text-center">
            You&apos;ll join as a <span className="font-semibold text-white">{invite?.role}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-900 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {clerkUser ? (
          <button
            onClick={handleAcceptInvite}
            disabled={isAccepting}
            className="w-full px-6 py-3 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAccepting ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Joining...
              </>
            ) : (
              "Accept Invite"
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#888] text-center mb-4">
              Sign in or create an account to join this workspace
            </p>
            <SignInButton mode="modal">
              <button className="w-full px-6 py-3 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-lg">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="w-full px-6 py-3 text-sm font-medium text-white border border-[#333] hover:bg-[#1a1a1a] rounded-lg">
                Create Account
              </button>
            </SignUpButton>
          </div>
        )}
      </div>
    </div>
  );
}
