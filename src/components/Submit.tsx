"use client";

import { useFormStatus } from "react-dom";

/** Submit button for server-action forms: shows a spinner and blocks double submits while the server works. */
export function Submit({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} gap-2 disabled:cursor-wait disabled:opacity-80`}>
      {pending && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
