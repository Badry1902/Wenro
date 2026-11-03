import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePlatform } from "@/lib/workspaces";
import { TeamPage } from "@/components/TeamPage";

export const dynamic = "force-dynamic";

export default async function AdminTeam({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ws = await requirePlatform(locale, "team");
  if (!["owner", "manager"].includes(ws.role)) notFound();
  const q = await searchParams;
  return <TeamPage locale={locale} org={ws.org_id} back="/app/admin/team" myRole={ws.role} ok={q.ok} err={q.err} />;
}
