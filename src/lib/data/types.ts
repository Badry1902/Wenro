export type Currency = "EUR" | "USD" | "EGP";

export type PriceRow = {
  kind: "adult" | "child" | "infant" | "private_group" | "extra" | "transport";
  ref_id: string | null;
  per: "person" | "booking" | "vehicle";
  currency: Currency;
  price_minor: number;
  vehicle_capacity: number | null;
  zone_id: string | null;
  age_min: number | null;
  age_max: number | null;
  max_group: number | null;
};

export type SlotRow = { id: string; starts_at: string; seats_left: number };
export type HotelRow = { id: string; name: string; zone_id: string; zone: string };
export type ExtraRow = { id: string; per: "person" | "booking"; price_minor: number; name: string | null };

export type ExperiencePage = {
  id: string;
  slug: string;
  booking_mode: "instant" | "request";
  duration_minutes: number | null;
  currency: Currency;
  private_available: boolean;
  locale: string | null;
  title: string | null;
  summary: string | null;
  description: string | null;
  itinerary: string | null;
  included: string | null;
  excluded: string | null;
  requirements: string | null;
  meeting_info: string | null;
  category: string | null;
  policy: { code: string; free_cancel_hours: number } | null;
  prices: PriceRow[];
  extras: ExtraRow[];
  slots: SlotRow[];
  hotels: HotelRow[];
  media: { path: string; alt: string | null }[];
  fx: Record<string, number>;
};

export type ExperienceCard = {
  id: string;
  slug: string;
  title: string | null;
  summary: string | null;
  category: string | null;
  currency: Currency;
  duration_minutes: number | null;
  from_minor: number | null;
};

export type BookingView = {
  id: string;
  ref: string;
  status: "pending_request" | "confirmed" | "cancelled" | "expired" | "declined";
  execution_status: "scheduled" | "executed" | "no_show" | "not_operated";
  reconfirm_status: "not_sent" | "sent" | "confirmed";
  starts_at: string;
  currency: Currency;
  paid_minor: number;
  gross_minor: number;
  discount_minor: number;
  qr_token: string;
  locale: string;
  is_private: boolean;
  transport: boolean;
  display_currency: string | null;
  display_rate: number | null;
  cancel_reason: string | null;
  terms: { cancellation_policy: { code: string; free_cancel_hours: number } | null };
  experience: { slug: string; title: string | null; meeting_info: string | null };
  operator: string;
  hotel: string | null;
  zone: string | null;
  lines: { kind: string; quantity: number; unit_price_minor: number; line_price_minor: number }[];
  customer: { full_name: string; email: string; phone: string; room: string | null };
};
