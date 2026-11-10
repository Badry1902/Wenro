import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { platformCan } from "@/lib/permissions";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, Empty, Flash, PageTitle, btn } from "@/components/ui";
import { setOrgStatus } from "../../actions";
import { ListFilter } from "@/components/ListFilter";

export const dynamic = "force-dynamic";

type Org = {
  id: string; type: "operator" | "marketer" | "agency" | "platform"; name: string; status: string; phone: string | null;
  email: string | null; instapay: string | null; created_at: string; codes: string[] | null;
};
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function AdminPartners({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  const ws = await requirePlatform(locale, "partners");
  const canAct = platformCan(ws.role, "partnersAct");
  const t = await getTranslations("app.partners");
  const tt = await getTranslations("app.types");
  const format = await getFormatter();
  const tf = await getTranslations("app.filter");
  const ts = await getTranslations("app.status");
  const orgs = (await rpc<Org[]>("admin_organizations", {}, "user")).filter((o) => o.type !== "platform");
  const order = { pending: 0, active: 1, suspended: 2 } as Record<string, number>;
  orgs.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.name.localeCompare(b.name));
  const back = "/app/admin/partners";
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /></>);
  const action = (o: Org, status: string, label: string, style: string) => (
    <form action={setOrgStatus}>{hidden}<input type="hidden" name="org" value={o.id} /><input type="hidden" name="status" value={status} /><button className={style}>{label}</button></form>
  );

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <Flash ok={q.ok} err={q.err} />
      {orgs.length === 0 ? <Empty>{t("none")}</Empty> : (
        <>
        <ListFilter target="partner-list"
          chips={(["operator", "agency", "marketer"] as const).map((k) => ({ value: k, label: tt(k), count: orgs.filter((o) => o.type === k).length }))}
          extra={{ name: "status", label: t("statusFilter"), all: t("anyStatus"), chips: ["pending", "active", "suspended"].map((k) => ({ value: k, label: ts.has(k) ? ts(k) : k, count: orgs.filter((o) => o.status === k).length })) }}
          labels={{ search: t("search"), all: tf("all"), clear: tf("clear"), results: tf.raw("shown") as string, none: t("noMatch"), group: t("typeFilter") }} />
        <ul id="partner-list" className="flex flex-col gap-3">
          {orgs.map((o) => (
            <li key={o.id} data-filter-item data-group={o.type} data-status={o.status} data-text={`${o.name} ${o.phone ?? ""} ${o.email ?? ""} ${(o.codes ?? []).join(" ")} ${o.instapay ?? ""}`} className={`flex flex-wrap items-center justify-between gap-3 rounded-card border p-4 ${o.status === "pending" ? "border-apricot bg-apricot-tint" : "border-line bg-surface"}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-bold">{o.name}<Badge value={o.status} /><span className="text-small font-semibold text-ink-muted">{tt(o.type)}</span></div>
                <div className="text-small text-ink-muted">
                  {o.phone && <span dir="ltr">{o.phone}</span>}{o.email && <> · <span dir="ltr">{o.email}</span></>}
                  {o.codes?.length ? <> · {t("code")}: <b dir="ltr">{o.codes.join(", ")}</b></> : null}
                  {(o.type === "marketer" || o.type === "agency") && <> · InstaPay: {o.instapay ?? t("missing")}</>}
                </div>
                <div className="text-[12px] text-ink-muted">{t("since", { date: format.dateTime(new Date(o.created_at), { day: "numeric", month: "short", year: "numeric" }) })}</div>
              </div>
              {canAct && <div className="flex flex-wrap gap-2">
                {o.status !== "active" && action(o, "active", o.status === "pending" ? t("approve") : t("reactivate"), btn.primary)}
                {o.status === "active" && action(o, "suspended", t("suspend"), btn.quiet)}
              </div>}
            </li>
          ))}
        </ul>
        </>
      )}
      <p className="mt-8 text-small text-ink-muted">{t("note")}</p>
    </>
  );
}
