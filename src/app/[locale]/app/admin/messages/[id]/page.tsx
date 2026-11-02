import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";
import { siteUrl } from "@/lib/env";
import { renderMessage, staffLocale, type AlertPayload, type BookingContext, type MessageKind } from "@/lib/messaging/render";
import { requirePlatform } from "@/lib/workspaces";
import { Badge, PageTitle, btn } from "@/components/ui";

export const dynamic = "force-dynamic";

type Detail = { id: string; kind: MessageKind; recipient: string; locale: string; status: string; payload: AlertPayload; booking: BookingContext | null };

/** What the guest (or operator) receives, exactly as rendered — the manage link is replaced by a placeholder. */
export default async function MessagePreview({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePlatform(locale);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await getTranslations("app.messages");
  const m = await rpc<Detail>("admin_message_detail", { p_id: id }, "user").catch((e) => {
    if (e instanceof RpcError && e.code === "message_not_found") notFound();
    throw e;
  });
  const readerLocale = m.recipient === "guest" ? m.locale : staffLocale();
  const r = await renderMessage(m.kind, {
    locale: readerLocale,
    booking: m.booking,
    payload: m.kind === "admin_alert" ? m.payload : null,
    link: `${siteUrl()}/${m.locale}/booking/link-hidden-in-preview`,
    dashboardUrl: `${siteUrl()}/${readerLocale}/app`,
  });

  return (
    <>
      <PageTitle title={t("previewTitle")} sub={r.subject} actions={<Link href="/app/admin/messages" className={btn.quiet}>{t("back")}</Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-small">
        <Badge value={m.status} /> <span>{t.has(`kinds.${m.kind}`) ? t(`kinds.${m.kind}`) : m.kind}</span> · <span>{readerLocale.toUpperCase()}</span>
      </div>
      <iframe title={r.subject} srcDoc={r.html} sandbox="" className="h-[720px] w-full max-w-2xl rounded-card border border-line bg-white" />
      <details className="mt-4 max-w-2xl">
        <summary className="cursor-pointer font-semibold">{t("plainText")}</summary>
        <pre dir={r.dir} className="mt-2 whitespace-pre-wrap rounded-card bg-[#F7F8FC] p-4 text-[14px]">{r.text}</pre>
      </details>
    </>
  );
}
