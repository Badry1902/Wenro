import type { Workspace } from "@/lib/workspaces";

/**
 * What each WENRO team role may open and do in the admin dashboard.
 * Mirrors the checks inside the database functions (app.is_platform(array[...])): the database stays the
 * real gate, this map only decides which pages, menu items and buttons a person sees, so nobody is shown
 * something that would be refused.
 */
type Role = Workspace["role"];
const PLATFORM = {
  /** finance_overview, statements, payouts, dues pages, money on the overview */
  finance: ["owner", "finance"],
  /** admin_bookings with guest contacts, admin_cancel_booking, sealed_link_for (finance sees trips on the dues pages, without guest contacts) */
  bookings: ["owner", "ops", "support"],
  /** admin_organizations (list) */
  partners: ["owner", "ops", "finance"],
  /** set_org_status */
  partnersAct: ["owner", "ops"],
  /** admin_experiences + editor */
  experiences: ["owner", "ops", "content"],
  /** admin_reviews, moderate_review */
  reviews: ["owner", "ops", "content"],
  /** coupons list / save_coupon */
  coupons: ["owner", "ops", "finance"],
  /** admin_messages; retry_message, run jobs */
  messages: ["owner", "ops", "support"],
  /** team page, demo data */
  team: ["owner"],
} as const satisfies Record<string, readonly Role[]>;

export type PlatformPerm = keyof typeof PLATFORM;

export function platformCan(role: Role, perm: PlatformPerm) {
  return (PLATFORM[perm] as readonly Role[]).includes(role);
}

/** Operator and partner organisations: owners and managers run the business side; staff do the daily work. */
export const isOrgManager = (w: Workspace) => w.role === "owner" || w.role === "manager";
