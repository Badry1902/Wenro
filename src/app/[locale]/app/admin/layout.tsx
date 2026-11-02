import { getTranslations } from "next-intl/server";
import { requirePlatform } from "@/lib/workspaces";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ws = await requirePlatform(locale);
  const t = await getTranslations("app.nav");
  const nav = [
    { href: "/app/admin", label: t("overview"), exact: true },
    { href: "/app/admin/bookings", label: t("bookings") },
    { href: "/app/admin/partners", label: t("partners") },
    { href: "/app/admin/experiences", label: t("experiences") },
    { href: "/app/admin/finance", label: t("finance") },
    { href: "/app/admin/coupons", label: t("coupons") },
    { href: "/app/admin/messages", label: t("messages") },
    ...(["owner", "manager"].includes(ws.role) ? [{ href: "/app/admin/team", label: t("team") }] : []),
  ];
  return <WorkspaceShell current={ws} nav={nav}>{children}</WorkspaceShell>;
}
