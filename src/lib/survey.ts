/**
 * The traveller survey (wenro.site/survey): what experienced travellers who have not used WENRO yet
 * expect from booking tours and activities. Questions live here (English and Arabic; other site
 * languages show English). The server checks every answer against this list before saving.
 *
 * Changing a question's options after answers came in: add new option ids, never reuse an old id
 * for a different meaning, or the results page will mix the two.
 */
export const SURVEY_ID = "travellers-2026-11";

type Text = { en: string; ar: string };
type Option = { id: string } & Text;

export type Question =
  | { id: string; kind: "one"; q: Text; hint?: Text; options: Option[]; other?: boolean; max?: number; required?: boolean }
  | { id: string; kind: "many"; q: Text; hint?: Text; options: Option[]; other?: boolean; max?: number; required?: boolean }
  | { id: string; kind: "text"; q: Text; hint?: Text; required?: boolean; long?: boolean }
  | { id: string; kind: "scale"; q: Text; hint?: Text; rows: Option[]; required?: boolean };

export type Section = { id: string; title: Text; questions: Question[] };

const o = (id: string, en: string, ar: string): Option => ({ id, en, ar });

export const SURVEY: Section[] = [
  {
    id: "you",
    title: { en: "You and your trips", ar: "إنت وسفرياتك" },
    questions: [
      {
        id: "trips", kind: "one", required: true,
        q: { en: "How many leisure trips have you taken in the last 2 years?", ar: "سافرت كام رحلة للفسحة في آخر سنتين؟" },
        options: [o("1", "1", "1"), o("2-3", "2–3", "2 لـ 3"), o("4-6", "4–6", "4 لـ 6"), o("7+", "7 or more", "7 أو أكتر")],
      },
      {
        id: "egypt", kind: "one", required: true,
        q: { en: "Have you been to Egypt?", ar: "زرت مصر قبل كده؟" },
        options: [
          o("recent", "Yes, in the last 2 years", "أيوه، في آخر سنتين"),
          o("before", "Yes, longer ago", "أيوه، من زمان"),
          o("planning", "Not yet, but I'm planning to", "لسه، بس ناوي"),
          o("no", "No", "لأ"),
          o("live", "I live in Egypt", "أنا عايش في مصر"),
        ],
      },
      {
        id: "with", kind: "many",
        q: { en: "Who do you usually travel with?", ar: "بتسافر عادةً مع مين؟" },
        options: [
          o("alone", "Alone", "لوحدي"), o("partner", "Partner", "مع شريك حياتي"),
          o("kids", "Family with children", "مع العيلة والأطفال"), o("friends", "Friends", "مع أصحابي"),
          o("group", "Organised group tour", "مع جروب سياحي منظم"),
        ],
      },
      {
        id: "from", kind: "text",
        q: { en: "Which country do you live in?", ar: "عايش في أنهي بلد؟" },
      },
    ],
  },
  {
    id: "booking",
    title: { en: "How you book tours and activities", ar: "بتحجز الرحلات والأنشطة إزاي" },
    questions: [
      {
        id: "when", kind: "one", required: true,
        q: { en: "When do you usually book tours and activities?", ar: "بتحجز الرحلات والأنشطة امتى عادةً؟" },
        options: [
          o("before", "Before I travel", "قبل ما أسافر"),
          o("there", "After I arrive", "بعد ما أوصل"),
          o("both", "Some before, some there", "شوية قبل وشوية هناك"),
        ],
      },
      {
        id: "where", kind: "many", required: true, other: true,
        q: { en: "Where have you booked them? Pick all that apply.", ar: "حجزتها منين قبل كده؟ اختار كل اللي ينطبق." },
        options: [
          o("platform", "Online booking sites (GetYourGuide, Viator, Klook…)", "مواقع حجز أونلاين زي GetYourGuide أو Viator"),
          o("hotel", "Hotel reception or travel rep", "استقبال الفندق أو مندوب الشركة"),
          o("local", "A guide, driver or someone I met there", "مرشد أو سواق أو حد قابلته هناك"),
          o("agency", "A travel agency at home", "شركة سياحة في بلدي"),
          o("direct", "Directly with the operator (WhatsApp, social media)", "مع الشركة نفسها مباشرة على واتساب أو السوشيال ميديا"),
          o("street", "On the street or at the beach", "في الشارع أو على البحر"),
        ],
      },
      {
        id: "recommended", kind: "one", required: true,
        q: { en: "Have you booked a trip because someone you met on holiday recommended it (hotel staff, a guide, a driver)?", ar: "حجزت رحلة قبل كده عشان حد قابلته في السفر رشحهالك (حد من الفندق، مرشد، سواق)؟" },
        options: [o("often", "Yes, often", "أيوه، كتير"), o("sometimes", "Sometimes", "أحيانًا"), o("never", "Never", "لأ، عمري")],
      },
      {
        id: "worries", kind: "many", max: 3, required: true, other: true,
        q: { en: "What worries you most when booking a local tour? Pick up to 3.", ar: "إيه أكتر حاجة بتقلقك وإنت بتحجز رحلة محلية؟ اختار لحد 3." },
        options: [
          o("price", "Paying more than a fair price", "إني أدفع أكتر من السعر الطبيعي"),
          o("scam", "Scams or unlicensed operators", "النصب أو شركات مش مرخصة"),
          o("quality", "The trip isn't what the photos showed", "الرحلة متطلعش زي الصور"),
          o("safety", "Safety", "الأمان"),
          o("pickup", "Pickup and timing", "مواعيد التوصيل والتأخير"),
          o("extras", "Hidden extras on the day", "مصاريف زيادة تطلع يومها"),
          o("refund", "Cancellation and refunds", "الإلغاء واسترجاع الفلوس"),
          o("language", "Language", "اللغة"),
          o("cash", "Having to pay in cash", "إني أدفع كاش"),
        ],
      },
      {
        id: "bad", kind: "text", long: true,
        q: { en: "Tell us about a booking that went wrong, or one that went really well.", ar: "احكيلنا عن حجز حصل فيه مشكلة، أو حجز كان ممتاز." },
        hint: { en: "Optional, a sentence or two is plenty.", ar: "اختياري، جملة أو اتنين كفاية." },
      },
    ],
  },
  {
    id: "decide",
    title: { en: "What would make you book", ar: "إيه اللي يخليك تحجز" },
    questions: [
      {
        id: "matters", kind: "scale", required: true,
        q: { en: "How much does each of these matter to you?", ar: "كل حاجة من دول تفرق معاك قد إيه؟" },
        hint: { en: "1 = doesn't matter, 5 = a must", ar: "1 = مش فارقة، 5 = لازم تكون موجودة" },
        rows: [
          o("price", "Final price shown up front", "السعر النهائي واضح من الأول"),
          o("cancel", "Free cancellation", "إلغاء مجاني"),
          o("reviews", "Reviews from people who really went", "تقييمات من ناس راحت فعلًا"),
          o("card", "Paying online by card", "الدفع أونلاين بالكارت"),
          o("cashday", "Paying on the day", "الدفع يوم الرحلة"),
          o("instant", "Instant confirmation", "تأكيد فوري"),
          o("whatsapp", "Chatting with the organiser on WhatsApp", "أكلم المنظم على واتساب"),
          o("language", "Everything in my language", "كل حاجة بلغتي"),
          o("licensed", "Seeing that the organiser is licensed", "أعرف إن المنظم مرخص"),
        ],
      },
      {
        id: "link", kind: "one", required: true,
        q: { en: "If someone you trust on your trip (hotel staff, your guide) sent you a link to book a tour, would you book through it?", ar: "لو حد بتثق فيه في رحلتك (حد من الفندق أو المرشد بتاعك) بعتلك لينك تحجز منه رحلة، هتحجز منه؟" },
        options: [
          o("yes", "Definitely", "أكيد"), o("probably", "Probably", "غالبًا"), o("unsure", "Not sure", "مش متأكد"),
          o("unlikely", "Probably not", "غالبًا لأ"), o("no", "No", "لأ"),
        ],
      },
      {
        id: "linkwhy", kind: "text",
        q: { en: "What would make you trust that link (or not)?", ar: "إيه اللي يخليك تثق في اللينك ده (أو لأ)؟" },
      },
      {
        id: "pay", kind: "many", required: true,
        q: { en: "How would you prefer to pay?", ar: "تحب تدفع إزاي؟" },
        options: [
          o("card", "Card online", "كارت أونلاين"), o("wallet", "Apple Pay or Google Pay", "Apple Pay أو Google Pay"),
          o("cash", "Cash on the day", "كاش يوم الرحلة"), o("deposit", "A deposit online, the rest on the day", "عربون أونلاين والباقي يومها"),
          o("transfer", "Bank transfer or InstaPay", "تحويل بنكي أو إنستاباي"),
        ],
      },
      {
        id: "confirm", kind: "many",
        q: { en: "Where would you like your booking confirmation?", ar: "تحب يوصلك تأكيد الحجز فين؟" },
        options: [o("email", "Email", "الإيميل"), o("whatsapp", "WhatsApp", "واتساب"), o("sms", "Text message", "رسالة SMS"), o("app", "In an app", "في أبلكيشن")],
      },
      {
        id: "wish", kind: "text", long: true,
        q: { en: "What's one thing a booking site should do that the ones you've used don't?", ar: "إيه حاجة واحدة نفسك موقع الحجز يعملها ومش لاقيها في المواقع اللي جربتها؟" },
      },
    ],
  },
];

export const QUESTIONS: Question[] = SURVEY.flatMap((s) => s.questions);

export type Answers = Record<string, string | string[] | Record<string, number>>;
export type Submission = { answers: Answers; other: Record<string, string>; contact: string | null };

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n) : "");

/** Keeps only known questions and options; returns the clean answers, or the first question that is missing. */
export function cleanAnswers(raw: unknown): { ok: true; value: Submission } | { ok: false; missing: string } {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const ans = (src.answers && typeof src.answers === "object" ? src.answers : {}) as Record<string, unknown>;
  const oth = (src.other && typeof src.other === "object" ? src.other : {}) as Record<string, unknown>;
  const answers: Answers = {};
  const other: Record<string, string> = {};
  for (const q of QUESTIONS) {
    const v = ans[q.id];
    if (q.kind === "text") {
      const t = clip(v, q.long ? 1000 : 120);
      if (t) answers[q.id] = t;
    } else if (q.kind === "one") {
      if (typeof v === "string" && q.options.some((x) => x.id === v)) answers[q.id] = v;
    } else if (q.kind === "many") {
      const ids = Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && q.options.some((y) => y.id === x)))] : [];
      const extra = q.other ? clip(oth[q.id], 200) : "";
      if (extra) other[q.id] = extra;
      const cap = q.max ? q.max - (extra ? 1 : 0) : ids.length;
      if (ids.length) answers[q.id] = ids.slice(0, Math.max(0, cap));
    } else {
      const m = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      const rows: Record<string, number> = {};
      for (const r of q.rows) {
        const n = Number(m[r.id]);
        if (Number.isInteger(n) && n >= 1 && n <= 5) rows[r.id] = n;
      }
      if (Object.keys(rows).length) answers[q.id] = rows;
    }
    const has = answers[q.id] !== undefined || (q.kind === "many" && !!other[q.id]);
    if (q.required && !has) return { ok: false, missing: q.id };
  }
  const contact = clip(src.contact, 120) || null;
  return { ok: true, value: { answers, other, contact } };
}

export const surveyLang = (locale: string): "ar" | "en" => (locale === "ar" ? "ar" : "en");
