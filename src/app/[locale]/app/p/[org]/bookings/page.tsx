import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { formatMoney } from "@/lib/money";
import { requireWorkspace } from "@/lib/workspaces";
import { Badge, Empty, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

type Row = {
  booking_id: string; ref: string; experience_id: string; starts_at: string; status: string; execution_status: string;
  currency: string; paid_minor: number; commission_minor: number | null; commission_status: string | null;
  customer_name: string | null; created_by_user: string | null;
};
type Props = { params: Promise<{ locale: string; org: string }> };

export default async function PartnerBookings({ params }: Props) {
  const { locale, org } = await params;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["marketer", "agency"]);
  const t = await getTranslations("app.partnerBookings");
  const tp = await getTranslations("app.partner");
  const format = await getFormatter();
  const [rows, experiences] = await Promise.all([
    rpc<Row[]>("partner_bookings", { p_partner: org }, "user"),
    rpc<ExperienceCard[]>("experience_list", { p_locale: locale }, "anon").catch(() => [] as ExperienceCard[]),
  ]);
  const title = (id: string) => experiences.find((e) => e.id === id)?.title ?? "—";
  const m = (minor: number, c: string) => formatMoney({ minor: Number(minor), currency: c as "EUR" }, locale);

  return (
    <>
      <PageTitle title={t("title")} sub={t(ws.type === "agency" ? "subAgency" : "subMarketer")} />
      {rows.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.booking_id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-bold">
                  <span dir="ltr">{r.ref}</span>
                  <Badge value={r.execution_status === "scheduled" ? r.status : r.execution_status} />
                </div>
                <div className="text-[14px]">{title(r.experience_id)}{r.customer_name ? ` · ${r.customer_name}` : ""}</div>
                <div className="text-small text-ink-muted">{format.dateTime(new Date(r.starts_at), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {t("paid")} {m(r.paid_minor, r.currency)}</div>
              </div>
              <div className="text-end">
                <div className="font-bold tabular-nums">{r.commission_minor != null ? m(r.commission_minor, r.currency) : "—"}</div>
                {r.commission_status && <div className="text-small text-ink-muted">{tp(`stage.${r.commission_status}`)}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {ws.type === "marketer" && <p className="mt-8 text-small text-ink-muted">{t("privacy")}</p>}
    </>
  );
}
