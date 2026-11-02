import { getTranslations } from "next-intl/server";
import { requireWorkspace } from "@/lib/workspaces";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string; org: string }> }) {
  const { locale, org } = await params;
  const ws = await requireWorkspace(locale, org, ["marketer", "agency"]);
  const t = await getTranslations("app.nav");
  const base = `/app/p/${org}`;
  const nav = [
    { href: base, label: t("overview"), exact: true },
    ...(ws.type === "agency" ? [{ href: `${base}/book`, label: t("bookForClient") }] : []),
    { href: `${base}/bookings`, label: t("bookings") },
    ...(["owner", "manager"].includes(ws.role) ? [{ href: `${base}/team`, label: t("team") }] : []),
  ];
  return <WorkspaceShell current={ws} nav={nav}>{children}</WorkspaceShell>;
}
