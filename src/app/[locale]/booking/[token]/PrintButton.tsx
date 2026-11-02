"use client";

import { IconDownload } from "@/components/Icons";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()}
      className="flex min-h-12 items-center justify-center gap-2 rounded-control border border-discovery bg-surface font-bold text-discovery hover:bg-discovery-tint">
      <IconDownload size={18} />{label}
    </button>
  );
}
