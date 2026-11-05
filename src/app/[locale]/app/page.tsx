import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getWorkspaces, homeOf } from "@/lib/workspaces";
import { rpc } from "@/lib/data/rpc";
import { dataMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AppHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ws = await getWorkspaces(locale);
  // First sign-in by email (for example from an invitation): choose a username and password first
  if (dataMode() !== "localpg") {
    const me = await rpc<{ username: string | null; password_set: boolean } | null>("my_account", {}, "user").catch(() => null);
    if (me && (!me.username || !me.password_set)) redirect({ href: "/app/account?first=1", locale });
  }
  redirect({ href: ws.length ? homeOf(ws[0]) : "/app/join", locale });
}
