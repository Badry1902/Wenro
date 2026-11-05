import "server-only";

/**
 * Machine translation for trip texts (DeepL API). Set DEEPL_API_KEY in Vercel → Settings → Environment
 * Variables (a free DeepL API key ends in ":fx" and uses the free endpoint automatically). Without a key,
 * nothing is translated and the site falls back to English as before.
 */
export type Lang = "en" | "de" | "ru" | "fr" | "ar";
const TARGET: Record<Lang, string> = { en: "EN-GB", de: "DE", ru: "RU", fr: "FR", ar: "AR" };

export function translationConfigured() {
  return !!process.env.DEEPL_API_KEY;
}

/** Translates several texts at once; keeps line breaks (lists in the trip texts are one item per line). */
export async function translateTexts(texts: string[], from: Lang, to: Lang): Promise<string[] | null> {
  const key = process.env.DEEPL_API_KEY;
  if (!key || from === to || texts.length === 0) return null;
  const endpoint = key.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: texts, source_lang: from.toUpperCase(), target_lang: TARGET[to],
        split_sentences: "nonewlines", preserve_formatting: true,
        ...(to === "de" || to === "fr" || to === "ru" ? { formality: "prefer_more" } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) { console.error("deepl", res.status, (await res.text()).slice(0, 200)); return null; }
    const j = (await res.json()) as { translations: { text: string }[] };
    return j.translations.map((x) => x.text);
  } catch (e) {
    console.error("deepl failed", e);
    return null;
  }
}

export const TEXT_FIELDS = ["title", "summary", "description", "itinerary", "included", "excluded", "requirements", "meeting_info"] as const;
export type Texts = Partial<Record<(typeof TEXT_FIELDS)[number], string | null>>;

/** One trip's texts from one language into another (empty fields stay empty). */
export async function translateTrip(src: Texts, from: Lang, to: Lang): Promise<Texts | null> {
  const fields = TEXT_FIELDS.filter((f) => (src[f] ?? "").trim());
  if (!fields.length) return null;
  const out = await translateTexts(fields.map((f) => src[f]!.trim()), from, to);
  if (!out) return null;
  const r: Texts = {};
  fields.forEach((f, i) => { r[f] = f === "title" ? out[i].slice(0, 120) : out[i]; });
  return r;
}
