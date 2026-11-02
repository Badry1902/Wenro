import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { canManage, requireWorkspace } from "@/lib/workspaces";
import { EditorPage } from "@/components/editor/EditorPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; org: string; id: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function OperatorEditor({ params, searchParams }: Props) {
  const { locale, org, id } = await params;
  setRequestLocale(locale);
  const ws = await requireWorkspace(locale, org, ["operator"]);
  if (!canManage(ws) || (id !== "new" && !/^[0-9a-f-]{36}$/.test(id))) notFound();
  const q = await searchParams;
  return <EditorPage locale={locale} base={`/app/o/${org}/experiences`} id={id === "new" ? null : id} operatorId={org} ok={q.ok} err={q.err} />;
}
