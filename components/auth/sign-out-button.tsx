"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut({ redirectTo: "/login" });
    } catch {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={busy}
      className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 sm:px-4 sm:py-2"
    >
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
