import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePlatform } from "@/lib/workspaces";
import { EditorPage } from "@/components/editor/EditorPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ ok?: string; err?: string }> };

export default async function AdminEditor({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePlatform(locale, "experiences");
  if (id !== "new" && !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const q = await searchParams;
  return <EditorPage locale={locale} base="/app/admin/experiences" id={id === "new" ? null : id} operatorId={null} ok={q.ok} err={q.err} />;
}
