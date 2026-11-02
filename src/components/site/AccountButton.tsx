"use client";

import { Link } from "@/i18n/navigation";
import { IconGrid, IconUser } from "../Icons";
import { useSignedIn } from "./useSignedIn";

export function AccountButton({ labels, className = "" }: { labels: { signIn: string; dashboard: string }; className?: string }) {
  const signedIn = useSignedIn();
  return (
    <Link
      href={signedIn ? "/app" : "/signin"}
      className={`btn-press min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-small font-bold ${
        signedIn ? "bg-discovery text-white hover:bg-discovery-hover" : "border border-line text-ink hover:border-discovery hover:text-discovery"
      } ${className}`}
    >
      {signedIn ? <IconGrid size={18} /> : <IconUser size={18} />}
      {signedIn ? labels.dashboard : labels.signIn}
    </Link>
  );
}
