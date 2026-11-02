import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getWorkspaces, homeOf } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function AppHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ws = await getWorkspaces(locale);
  redirect({ href: ws.length ? homeOf(ws[0]) : "/app/join", locale });
}
