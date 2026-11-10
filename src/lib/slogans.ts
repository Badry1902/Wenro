/**
 * WENRO's approved slogans exist in English only for now. Other languages keep their own (non-slogan)
 * copy until translated slogans are approved, so slogan-only sections show for these locales only.
 */
export const SLOGAN_LOCALES = ["en"] as const;
export const hasSlogans = (locale: string) => (SLOGAN_LOCALES as readonly string[]).includes(locale);
