"use client";

import { useState, type InputHTMLAttributes } from "react";
import { useTranslations } from "next-intl";

/** Password field with a show/hide button (hidden by default). */
export function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const t = useTranslations("common");
  const [shown, setShown] = useState(false);
  return (
    <span className="pw-field relative flex">
      <input {...props} type={shown ? "text" : "password"} autoCapitalize="none" spellCheck={false}
        className={`${className} w-full pe-12`} />
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? t("hidePassword") : t("showPassword")} aria-pressed={shown}
        title={shown ? t("hidePassword") : t("showPassword")}
        className="absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-control text-ink-muted hover:text-ink">
        {shown ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10 10 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-3.1 4.1M6.1 6.9C3.9 8.3 2.5 10.4 2 12c1 2.5 5 7 10 7a9.7 9.7 0 0 0 4.2-.9" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" /><circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
