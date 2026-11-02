import { getTranslations } from "next-intl/server";
import { canManage, requireWorkspace } from "@/lib/workspaces";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function OperatorLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string; org: string }> }) {
  const { locale, org } = await params;
  const ws = await requireWorkspace(locale, org, ["operator"]);
  const t = await getTranslations("app.nav");
  const base = `/app/o/${org}`;
  const nav = [
    { href: base, label: t("today"), exact: true },
    { href: `${base}/departures`, label: t("departures") },
    ...(canManage(ws) ? [{ href: `${base}/experiences`, label: t("experiences") }] : []),
    ...(["owner", "manager"].includes(ws.role) ? [{ href: `${base}/money`, label: t("money") }, { href: `${base}/team`, label: t("team") }] : []),
  ];
  return <WorkspaceShell current={ws} nav={nav}>{children}</WorkspaceShell>;
}
