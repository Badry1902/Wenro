import { z } from "zod";
import { locales } from "@/i18n/routing";

/** One of the site's languages; anything else becomes English. Used by every server action form. */
export const localeSchema = z.enum(locales);
export const formLocale = localeSchema.catch("en");
