import { NextResponse, type NextRequest } from "next/server";
import { rpc } from "@/lib/data/rpc";
import { allow, clientKey } from "@/lib/ratelimit";
import { SURVEY_ID, cleanAnswers } from "@/lib/survey";

const LOCALES = new Set(["ar", "en", "de", "ru", "fr"]);
const SOURCE = /^[a-z0-9_-]{1,30}$/;

/** Saves one traveller survey answer. Anonymous; contact details only when the traveller ticked the consent box. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  // a field people never see: bots fill it, people don't
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true });
  const clean = cleanAnswers(body);
  if (!clean.ok) return NextResponse.json({ error: "missing", question: clean.missing }, { status: 400 });
  if (!(await allow(`survey:${await clientKey()}`, 5, 3600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const locale = typeof body.locale === "string" && LOCALES.has(body.locale) ? body.locale : "en";
  const source = typeof body.source === "string" && SOURCE.test(body.source.toLowerCase()) ? body.source.toLowerCase() : null;
  const contact = body.consent === true ? clean.value.contact : null;
  try {
    await rpc("submit_survey", {
      p_survey: SURVEY_ID, p_locale: locale, p_source: source,
      p_answers: clean.value.answers, p_other: clean.value.other, p_contact: contact,
    }, "service");
  } catch (e) {
    console.error("survey save failed", e);
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
