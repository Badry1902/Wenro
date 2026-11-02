import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { loadMessages } from "./merge";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    // Business timezone: every departure time is shown in Hurghada time.
    timeZone: "Africa/Cairo",
    // English is the base; texts missing in another language fall back to English.
    messages: await loadMessages(locale),
  };
});
