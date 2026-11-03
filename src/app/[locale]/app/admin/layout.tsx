import { getTranslations } from "next-intl/server";
import { requirePlatform } from "@/lib/workspaces";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { platformCan, type PlatformPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ws = await requirePlatform(locale);
  const t = await getTranslations("app.nav");
  // Only what this person's role can open (see src/lib/permissions.ts)
  const items: { href: string; label: string; exact?: boolean; perm?: PlatformPerm }[] = [
    { href: "/app/admin", label: t("overview"), exact: true },
    { href: "/app/admin/bookings", label: t("bookings"), perm: "bookings" },
    { href: "/app/admin/finance", label: t("finance"), perm: "finance" },
    { href: "/app/admin/partners", label: t("partners"), perm: "partners" },
    { href: "/app/admin/experiences", label: t("experiences"), perm: "experiences" },
    { href: "/app/admin/coupons", label: t("coupons"), perm: "coupons" },
    { href: "/app/admin/messages", label: t("messages"), perm: "messages" },
    { href: "/app/admin/team", label: t("team"), perm: "team" },
  ];
  const nav = items.filter((n) => !n.perm || platformCan(ws.role, n.perm));
  return <WorkspaceShell current={ws} nav={nav}>{children}</WorkspaceShell>;
}
