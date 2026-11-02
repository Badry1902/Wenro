import { getFormatter, getTranslations } from "next-intl/server";
import { rpc } from "@/lib/data/rpc";
import { Badge, Card, Empty, Flash, PageTitle, btn, field } from "@/components/ui";
import { Submit } from "@/components/Submit";
import { cancelInvite, inviteMember, setMemberActive } from "@/app/[locale]/app/actions";

type Team = {
  members: { user_id: string; email: string; role: string; active: boolean; since: string; me: boolean }[];
  invites: { id: string; email: string; role: string; created_at: string }[];
  roles: string[];
};

/** Team page for any workspace: owners and managers invite people by email; they join on their next sign-in. */
export async function TeamPage({ locale, org, back, myRole, ok, err }: { locale: string; org: string; back: string; myRole: string; ok?: string; err?: string }) {
  const t = await getTranslations("app.team");
  const tr = await getTranslations("app.roles");
  const format = await getFormatter();
  const team = await rpc<Team>("org_team", { p_org: org }, "user");
  const hidden = (<><input type="hidden" name="locale" value={locale} /><input type="hidden" name="back" value={back} /><input type="hidden" name="org" value={org} /></>);
  const roles = team.roles.filter((r) => r !== "manager" || myRole === "owner");

  return (
    <>
      <PageTitle title={t("title")} sub={t("sub")} />
      <Flash ok={ok} err={err} />
      <Card title={t("inviteTitle")} className="mb-8">
        <form action={inviteMember} className="flex flex-wrap items-end gap-3">
          {hidden}
          <label className="flex min-w-60 flex-1 flex-col gap-1.5 text-small font-bold">{t("email")}
            <input name="email" type="email" required dir="ltr" autoComplete="off" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-small font-bold">{t("role")}
            <select name="role" className={field} defaultValue={roles.includes("staff") ? "staff" : roles[0]}>
              {roles.map((r) => <option key={r} value={r}>{tr(r)}</option>)}
            </select>
          </label>
          <Submit className={btn.primary}>{t("invite")}</Submit>
        </form>
        <p className="mt-3 text-small text-ink-muted">{t("inviteHint")}</p>
      </Card>

      {team.invites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-bold">{t("pending")}</h2>
          <ul className="divide-y divide-line rounded-card border border-line">
            {team.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <span><span dir="ltr" className="font-semibold">{i.email}</span> · {tr(i.role)} · <span className="text-small text-ink-muted">{format.dateTime(new Date(i.created_at), { day: "numeric", month: "short" })}</span></span>
                <form action={cancelInvite}>{hidden}<input type="hidden" name="invite" value={i.id} /><Submit className={btn.quiet}>{t("cancelInvite")}</Submit></form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-3 font-bold">{t("members")}</h2>
      {team.members.length === 0 ? <Empty>{t("none")}</Empty> : (
        <ul className="divide-y divide-line rounded-card border border-line">
          {team.members.map((m) => (
            <li key={m.user_id} className={`flex flex-wrap items-center justify-between gap-3 p-3 ${m.active ? "" : "opacity-60"}`}>
              <span className="flex flex-wrap items-center gap-2"><span dir="ltr" className="font-semibold">{m.email}</span> · {tr(m.role)}
                {m.me && <span className="text-small text-ink-muted">({t("you")})</span>}
                {!m.active && <Badge value="suspended" />}</span>
              {!m.me && m.role !== "owner" && (myRole === "owner" || m.role === "staff") && (
                <form action={setMemberActive}>{hidden}<input type="hidden" name="user" value={m.user_id} /><input type="hidden" name="active" value={m.active ? "0" : "1"} />
                  <Submit className={btn.quiet}>{m.active ? t("deactivate") : t("reactivate")}</Submit></form>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
