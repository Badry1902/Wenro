import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc } from "@/lib/data/rpc";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, Card, Empty, Flash, PageTitle, btn } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { retryMessage, runJobsNow } from "../../actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string; kind: string; recipient: string; status: string; attempts: number; last_error: string | null;
  created_at: string; sent_at: string | null; locale: string; ref: string | null; to_address: string | null;
};
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string; n?: string }> };

export default async function AdminMessages({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = await searchParams;
  await requirePlatform(locale, "messages");
  const t = await getTranslations("app.messages");
  const format = await getFormatter();
  const data = await rpc<{ counts: Record<string, number>; messages: Row[] }>("admin_messages", { p_limit: 200 }, "user");
  const sending = Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
  const back = "/app/admin/messages";

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <Flash ok={q.ok} err={q.err} />
      {q.ok === "jobs_ran" && <p className="-mt-3 mb-5 text-small text-ink-muted">{t("ranCount", { n: Number(q.n ?? 0) })}</p>}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
        <p role="note" className={`rounded-card p-4 text-small ${sending ? "bg-success-tint text-success" : "bg-warning-tint text-warning"}`}>
          {sending ? t("modeLive") : t("modeLog")}
        </p>
        <Card>
          <form action={runJobsNow} className="flex flex-col gap-2">
            <input type="hidden" name="locale" value={locale} />
            <Submit className={btn.primary}>{t("runNow")}</Submit>
            <span className="max-w-64 text-small text-ink-muted">{t("runNowHint")}</span>
          </form>
        </Card>
      </div>

      <ul className="mb-6 flex flex-wrap gap-2 text-small">
        {Object.entries(data.counts).map(([s, n]) => <li key={s} className="flex items-center gap-1.5"><Badge value={s} /> <span className="tabular-nums">{n}</span></li>)}
      </ul>

      {data.messages.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="flex flex-col gap-2">
          {data.messages.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 font-semibold">
                  {t.has(`kinds.${m.kind}`) ? t(`kinds.${m.kind}`) : m.kind}
                  {m.ref && <span dir="ltr" className="text-small text-ink-muted">{m.ref}</span>}
                  <Badge value={m.status} />
                </div>
                <div className="text-small text-ink-muted">
                  {t(`to.${m.recipient}`)}{m.to_address ? <> · <span dir="ltr">{m.to_address}</span></> : null} · {m.locale.toUpperCase()} ·{" "}
                  {format.dateTime(new Date(m.created_at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {m.attempts > 1 && <> · {t("attempts", { n: m.attempts })}</>}
                </div>
                {m.last_error && <div className="text-small text-critical" dir="ltr">{m.last_error}</div>}
              </div>
              <div className="flex gap-2">
                <Link href={`/app/admin/messages/${m.id}`} className={btn.quiet}>{t("preview")}</Link>
                {["failed", "skipped", "logged"].includes(m.status) && (
                  <form action={retryMessage}>
                    <input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} />
                    <input type="hidden" name="message" value={m.id} />
                    <Submit className={btn.quiet}>{t("retry")}</Submit>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
