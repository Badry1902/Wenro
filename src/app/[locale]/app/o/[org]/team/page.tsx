import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireWorkspace } from "@/lib/workspaces";
import { rpc } from "@/lib/data/rpc";
import { TeamPage } from "@/components/TeamPage";
import { Card, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { setOrgContact } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function OperatorTeam({ params, searchParams }: { params: Promise<{ locale: string; org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["operator"]);
  if (!["owner", "manager"].includes(ws.role)) notFound();
  const q = await searchParams;
  const t = await getTranslations("app.contact");
  const contact = await rpc<{ phone: string | null; email: string | null }>("org_contact", { p_org: org }, "user");
  return (
    <>
      <TeamPage locale={locale} org={org} back={`/app/o/${org}/team`} myRole={ws.role} ok={q.ok} err={q.err} />
      {/* The WhatsApp number that receives every new booking and booking request */}
      <Card title={t("title")} className="mt-8" id="contact">
        <p className="mb-4 text-small text-ink-muted">{t("sub")}</p>
        <form action={setOrgContact} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="org" value={org} />
          <input type="hidden" name="back" value={`/app/o/${org}/team`} />
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("phone")}
            <input name="phone" type="tel" required defaultValue={contact.phone ?? ""} inputMode="tel" autoComplete="tel" dir="ltr" placeholder="+20 10 1234 5678" className={`${field} w-56`} />
            <span className="font-normal text-ink-muted">{t("phoneHint")}</span>
          </label>
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("email")}
            <input name="email" type="email" defaultValue={contact.email ?? ""} autoComplete="email" dir="ltr" className={`${field} w-64`} />
            <span className="font-normal text-transparent" aria-hidden="true">.</span>
          </label>
          <Submit className={`${btn.primary} mb-6`}>{t("save")}</Submit>
        </form>
      </Card>
    </>
  );
}
