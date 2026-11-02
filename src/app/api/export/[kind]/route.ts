import { NextResponse, type NextRequest } from "next/server";
import { rpc, RpcError } from "@/lib/data/rpc";
import type { ExperienceCard } from "@/lib/data/types";
import { currentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** One CSV cell. Values that a spreadsheet would run as a formula are made plain text. */
function cell(v: unknown) {
  let s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const cairo = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Africa/Cairo" }).slice(0, 16);
const money = (minor: unknown) => (minor == null ? "" : (Number(minor) / 100).toFixed(2));

/**
 * Bookings as a spreadsheet file (CSV, opens in Excel / Google Sheets).
 *   /api/export/operator?org=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
 *   /api/export/partner?org=<id>
 *   /api/export/admin?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Runs as the signed-in person: the database decides what they may see (operators see phone numbers
 * only close to the trip, marketers never see guest details, staff never see money).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(await currentUserId())) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const org = q.get("org") ?? "";
  const from = DAY.test(q.get("from") ?? "") ? q.get("from")! : new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const to = DAY.test(q.get("to") ?? "") ? q.get("to")! : new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  const range = { p_from: `${from}T00:00:00+02:00`, p_to: `${to}T23:59:59+02:00` };
  const titles = new Map(
    (await rpc<ExperienceCard[]>("experience_list", { p_locale: "en" }, "anon").catch(() => [] as ExperienceCard[])).map((e) => [e.id, e.title ?? e.slug]),
  );

  let header: string[] = [];
  let lines: unknown[][] = [];
  try {
    if (kind === "operator" && GUID.test(org)) {
      type R = { ref: string; experience_id: string; starts_at: string; status: string; execution_status: string; reconfirm_status: string; adults: number; children: number; infants: number; is_private: boolean; hotel: string | null; zone: string | null; transport: boolean; room: string | null; customer_name: string; customer_phone: string | null; currency: string; paid_minor: number | null; operator_net_minor: number | null };
      const rows = await rpc<R[]>("operator_bookings", { p_operator: org, ...range }, "user");
      header = ["Reference", "Start (Hurghada)", "Experience", "Status", "Trip", "Reconfirmed", "Adults", "Children", "Infants", "Private", "Pickup", "Hotel", "Area", "Room", "Guest", "Phone", "Currency", "Guest pays", "You keep"];
      lines = rows.map((r) => [r.ref, cairo(r.starts_at), titles.get(r.experience_id) ?? "", r.status, r.execution_status, r.reconfirm_status, r.adults, r.children, r.infants, r.is_private ? "yes" : "", r.transport ? "yes" : "", r.hotel, r.zone, r.room, r.customer_name, r.customer_phone, r.currency, money(r.paid_minor), money(r.operator_net_minor)]);
    } else if (kind === "partner" && GUID.test(org)) {
      type R = { ref: string; experience_id: string; starts_at: string; status: string; execution_status: string; currency: string; paid_minor: number; commission_minor: number | null; commission_status: string | null; customer_name: string | null };
      const rows = await rpc<R[]>("partner_bookings", { p_partner: org }, "user");
      header = ["Reference", "Start (Hurghada)", "Experience", "Status", "Trip", "Guest", "Currency", "Guest pays", "Your commission", "Commission status"];
      lines = rows.map((r) => [r.ref, cairo(r.starts_at), titles.get(r.experience_id) ?? "", r.status, r.execution_status, r.customer_name ?? "", r.currency, money(r.paid_minor), money(r.commission_minor), r.commission_status]);
    } else if (kind === "admin") {
      const rows = await rpc<Record<string, unknown>[]>("admin_bookings", { ...range, p_status: null }, "user");
      header = rows[0] ? Object.keys(rows[0]).filter((k) => !/token|secret/i.test(k)) : ["ref"];
      lines = rows.map((r) => header.map((k) => (k === "starts_at" && typeof r[k] === "string" ? cairo(r[k] as string) : /_minor$/.test(k) ? money(r[k]) : r[k])));
    } else {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  } catch (e) {
    const code = e instanceof RpcError ? e.code : "unexpected_error";
    return NextResponse.json({ error: code }, { status: code === "forbidden" ? 403 : 400 });
  }

  // BOM so Excel opens Arabic text correctly
  const csv = "﻿" + [header, ...lines].map((l) => l.map(cell).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wenro-${kind}-bookings-${from}-to-${to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
