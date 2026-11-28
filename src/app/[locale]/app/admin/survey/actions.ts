"use server";

import { z } from "zod";
import { formLocale } from "@/lib/locale";
import { redirect } from "@/i18n/navigation";
import { rpc, RpcError } from "@/lib/data/rpc";

/** Removes one survey answer (spam, or a traveller asked us to delete their contact). The database checks the role. */
export async function deleteSurveyResponse(form: FormData) {
  const locale = formLocale.parse(form.get("locale"));
  const id = z.guid().parse(form.get("id"));
  let q = "ok=survey_deleted";
  try {
    await rpc("delete_survey_response", { p_id: id }, "user");
  } catch (e) {
    q = `err=${e instanceof RpcError ? e.code : "unexpected_error"}`;
  }
  redirect({ href: `/app/admin/survey?${q}`, locale });
}
