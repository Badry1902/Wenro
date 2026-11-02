export type Messages = { [k: string]: string | Messages };

/** English is the base: a text missing in another language shows in English instead of breaking. */
export function mergeMessages(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = base[k];
    out[k] = typeof v === "object" && typeof b === "object" ? mergeMessages(b, v) : v;
  }
  return out;
}

export async function loadMessages(locale: string): Promise<Messages> {
  const en = (await import(`../../messages/en.json`)).default as Messages;
  if (locale === "en") return en;
  const own = (await import(`../../messages/${locale}.json`)).default as Messages;
  return mergeMessages(en, own);
}
