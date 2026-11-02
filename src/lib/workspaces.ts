import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { currentUserId } from "@/lib/auth";
import { rpc } from "@/lib/data/rpc";

export type Workspace = {
  org_id: string;
  type: "platform" | "operator" | "agency" | "marketer";
  name: string;
  status: "pending" | "active" | "suspended";
  role: "owner" | "manager" | "staff" | "ops" | "finance" | "support" | "content";
};

/** Signed-in user's workspaces (one request per page render). Sends signed-out visitors to sign-in. */
export const getWorkspaces = cache(async (locale: string) => {
  const uid = await currentUserId();
  if (!uid) redirect({ href: "/signin", locale });
  // Pending team invitations for this email become memberships. Checked alongside the list (no extra
  // wait); the list is fetched again only when an invitation was actually accepted.
  const [accepted, list] = await Promise.all([
    rpc<number>("accept_invites", {}, "user").catch((e) => { console.error("accept_invites", e); return 0; }),
    rpc<Workspace[]>("my_workspaces", {}, "user"),
  ]);
  return accepted > 0 ? rpc<Workspace[]>("my_workspaces", {}, "user") : list;
});

export async function requireWorkspace(locale: string, orgId: string, types: Workspace["type"][]) {
  const ws = (await getWorkspaces(locale)).find((w) => w.org_id === orgId && types.includes(w.type));
  if (!ws) notFound();
  return ws;
}

export async function requirePlatform(locale: string) {
  const ws = (await getWorkspaces(locale)).find((w) => w.type === "platform");
  if (!ws) notFound();
  return ws;
}

export function homeOf(w: Workspace) {
  return w.type === "platform" ? "/app/admin" : w.type === "operator" ? `/app/o/${w.org_id}` : `/app/p/${w.org_id}`;
}

export const canManage = (w: Workspace) => ["owner", "manager", "ops"].includes(w.role);
