import { NextResponse } from "next/server";
import { rpc } from "@/lib/data/rpc";
import { openProof } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Opens a payment receipt. The database allows only the WENRO owner and finance team (payment_proof). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const name = await rpc<string | null>("payment_proof", { p_payment: id }, "user").catch(() => null);
  if (!name) return new NextResponse("Not found", { status: 404 });
  const f = await openProof(name);
  if (!f) return new NextResponse("Not found", { status: 404 });
  if ("url" in f) return NextResponse.redirect(f.url, { headers: { "Cache-Control": "no-store" } });
  return new NextResponse(new Uint8Array(f.buf), { headers: { "Content-Type": f.type, "Cache-Control": "private, no-store", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" } });
}
