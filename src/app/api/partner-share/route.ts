import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { currentUserId } from "@/lib/auth";
import { rpc } from "@/lib/data/rpc";
import { siteUrl } from "@/lib/env";
import type { Workspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

type Summary = { org: { status: string }; codes: { code: string; active: boolean }[] };

/**
 * For marketers and agencies browsing the public site: their own tracked link (and QR) for the trip they are
 * looking at. Only the signed-in person's own partner codes; nothing for anyone else.
 */
export async function GET(req: NextRequest) {
  const none = NextResponse.json({ partners: [] }, { headers: { "cache-control": "private, no-store" } });
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const locale = req.nextUrl.searchParams.get("locale") ?? "en";
  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !/^(en|de|ru|fr|ar)$/.test(locale)) return none;
  if (!(await currentUserId().catch(() => null))) return none;
  const ws = await rpc<Workspace[]>("my_workspaces", {}, "user").catch(() => [] as Workspace[]);
  const partners = ws.filter((w) => (w.type === "marketer" || w.type === "agency") && w.status === "active");
  const out = [];
  for (const w of partners.slice(0, 6)) {
    const s = await rpc<Summary>("partner_summary", { p_partner: w.org_id }, "user").catch(() => null);
    const code = s?.codes.find((c) => c.active)?.code;
    if (!code) continue;
    const link = `${siteUrl()}/${locale}/experiences/${slug}?ref=${encodeURIComponent(code)}`;
    const qr = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#19244E", light: "#FFFFFF" } });
    out.push({ org: w.org_id, name: w.name, type: w.type, code, link, qr });
  }
  return NextResponse.json({ partners: out }, { headers: { "cache-control": "private, no-store" } });
}
