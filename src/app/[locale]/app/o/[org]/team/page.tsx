import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireWorkspace } from "@/lib/workspaces";
import { TeamPage } from "@/components/TeamPage";

export const dynamic = "force-dynamic";

export default async function OperatorTeam({ params, searchParams }: { params: Promise<{ locale: string; org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["operator"]);
  if (!["owner", "manager"].includes(ws.role)) notFound();
  const q = await searchParams;
  return <TeamPage locale={locale} org={org} back={`/app/o/${org}/team`} myRole={ws.role} ok={q.ok} err={q.err} />;
}
