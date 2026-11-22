"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { IconBack } from "./Icons";

/** Is this a workspace home page (where Back has nowhere useful to go inside the dashboard)? */
const isWorkspaceHome = (path: string) => /^\/app(\/admin|\/[opa]\/[^/]+)?\/?$/.test(path);

/** Parent page of a path: /experiences/x → /experiences, /app/o/ID/bookings → /app/o/ID. */
function parentOf(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "app") {
    // workspace homes: /app, /app/admin, /app/o/ID, /app/p/ID, /app/a/ID
    const home = parts[1] === "admin" ? 2 : ["o", "p", "a"].includes(parts[1]) ? 3 : 1;
    return "/" + parts.slice(0, Math.max(home, parts.length - 1)).join("/");
  }
  return parts.length > 1 ? "/" + parts.slice(0, -1).join("/") : "/";
}

/**
 * Back: returns to the previous page of this site when there is one (so filters and scroll are kept),
 * otherwise goes up to the parent page — never out of WENRO.
 */
export function BackButton({ className = "", tone = "light", scope = "site" }: { className?: string; tone?: "light" | "dark"; scope?: "site" | "workspace" }) {
  const t = useTranslations("common");
  const path = usePathname();
  const router = useRouter();
  if (path === "/" || (scope === "workspace" && isWorkspaceHome(path))) return null;

  const back = () => {
    const nav = (window as unknown as { navigation?: { canGoBack?: boolean } }).navigation;
    const sameSite = nav?.canGoBack ?? (document.referrer.startsWith(location.origin) && history.length > 1);
    if (sameSite) router.back(); else router.push(parentOf(path));
  };
  return (
    <button type="button" onClick={back} aria-label={t("back")} title={t("back")}
      className={`btn-press grid size-11 shrink-0 place-items-center rounded-full ${tone === "dark" ? "text-white/90 hover:bg-white/10" : "text-ink hover:bg-discovery-tint"} ${className}`}>
      <IconBack size={22} />
    </button>
  );
}

