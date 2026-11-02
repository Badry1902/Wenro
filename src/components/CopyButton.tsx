"use client";

import { useState } from "react";

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the link stays selectable */ }
      }}
      className="btn-press inline-flex min-h-11 items-center justify-center rounded-control border border-discovery bg-surface px-4 font-bold text-discovery hover:bg-discovery-tint"
    >
      <span aria-live="polite"><span key={copied ? "done" : "copy"} className="value-tick">{copied ? done : label}</span></span>
    </button>
  );
}
