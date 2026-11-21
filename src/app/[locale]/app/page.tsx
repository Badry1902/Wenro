import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getWorkspaces, homeOf } from "@/lib/workspaces";
import { rpc } from "@/lib/data/rpc";
import { dataMode } from "@/lib/env";
import { usesGoogle } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ws = await getWorkspaces(locale);
  // First sign-in (for example from an invitation): choose a username, and a password unless they use Google
  if (dataMode() !== "localpg") {
    const me = await rpc<{ username: string | null; password_set: boolean } | null>("my_account", {}, "user").catch(() => null);
    if (me && (!me.username || (!me.password_set && !(await usesGoogle())))) redirect({ href: "/app/account?first=1", locale });
  }
  redirect({ href: ws.length ? homeOf(ws[0]) : "/app/join", locale });
}
