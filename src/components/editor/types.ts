export const LOCALES = ["en", "ar", "de", "ru", "fr"] as const;
export type Loc = (typeof LOCALES)[number];
export const TEXT_FIELDS = ["title", "summary", "description", "itinerary", "included", "excluded", "requirements", "meeting_info"] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export type EditorData = {
  id: string | null;
  slug?: string;
  status?: string;
  operator_id: string | null;
  operator?: string;
  category_id: string | null;
  booking_mode: "instant" | "request";
  duration_minutes: number | null;
  cancellation_policy_id: string | null;
  private_available: boolean;
  private_max_group: number | null;
  translations: Partial<Record<Loc, Partial<Record<TextField, string | null>>>>;
  prices: Partial<Record<"adult" | "child" | "infant" | "private_group", { net_minor: number; age_min: number | null; age_max: number | null; max_group: number | null; active: boolean }>>;
  extras: { id: string | null; net_minor: number; per: "person" | "booking"; names: Partial<Record<Loc, string>> }[];
  transport: { zone_id: string; net_minor: number; per: "vehicle" | "person"; vehicle_capacity: number | null }[];
  media: { id: string; path: string; alt: string | null; kind?: "image" | "video" }[];
};

export type EditorOptions = {
  categories: { id: string; slug: string; name: string }[];
  policies: { id: string; code: string; hours: number }[];
  zones: { id: string; name: string }[];
  operators: { id: string; name: string }[] | null;
  pricing: { operator_share_bps: number; rounding_minor: number };
};

export const emptyEditor = (operatorId: string | null): EditorData => ({
  id: null, operator_id: operatorId, category_id: null, booking_mode: "instant", duration_minutes: 240,
  cancellation_policy_id: null, private_available: false, private_max_group: null,
  translations: { en: { title: "" } }, prices: {}, extras: [], transport: [], media: [],
});
