import type { ExperienceCard } from "@/lib/data/types";
import { CITIES, km, nearestCity, type City } from "@/lib/places";
import { themeFor } from "@/lib/themes";

/**
 * Trip search that understands what people mean, in five languages:
 *  - words are normalised (case, accents, Arabic letter forms),
 *  - synonyms map to the same idea ("snorkel", "schnorcheln", "سنوركل" → snorkel),
 *  - small typos are forgiven ("snorkle", "luxer"),
 *  - a city name ("dahab", "الأقصر") keeps trips that start there or nearby,
 *  - results are ranked (title match > idea match > description), not just filtered.
 */
export function norm(s: string) {
  return s.toLocaleLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")            // Arabic diacritics, hamza marks, tatweel
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim()
    .replace(/(^|\s)ال(?=\S{3,})/g, "$1");                 // Arabic "the" (الأهرامات → اهرامات)
}

// idea → words in en / de / fr / ru / ar (stems are fine: matching is by prefix)
const IDEAS: Record<string, string[]> = {
  snorkel: ["snorkel", "schnorch", "apnee", "palmes", "masque", "сноркел", "маск", "سنوركل", "سنوركلينج"],
  dive: ["dive", "diving", "scuba", "diver", "plongee", "plonge", "tauch", "дайв", "погруж", "غطس", "غوص"],
  boat: ["boat", "cruise", "sail", "yacht", "catamaran", "speedboat", "bateau", "croisiere", "voilier", "boot", "segel", "katamaran", "kreuzfahrt", "яхт", "лодк", "катер", "круиз", "мерк", "مركب", "يخت", "قارب", "ابحار", "لنش", "رحله بحريه"],
  island: ["island", "giftun", "ile", "insel", "остров", "جزيره", "جفتون"],
  dolphin: ["dolphin", "dauphin", "delfin", "дельфин", "دولفين", "دلافين"],
  beach: ["beach", "bay", "plage", "baie", "strand", "bucht", "пляж", "бухт", "شاطي", "خليج"],
  desert: ["desert", "safari", "bedouin", "dune", "wuste", "wueste", "beduin", "пустын", "сафари", "бедуин", "صحرا", "سفاري", "بدو", "كثبان"],
  quad: ["quad", "atv", "buggy", "jeep", "4x4", "квадр", "багги", "джип", "كواد", "باجي", "جيب", "موتوسيكل"],
  camel: ["camel", "chameau", "kamel", "верблюд", "جمل", "جمال"],
  stars: ["star", "stargaz", "milky", "etoile", "stern", "звезд", "نجوم", "سما"],
  history: ["temple", "pyramid", "pharao", "luxor", "karnak", "museum", "history", "ancient", "tomb", "tempel", "pyramide", "musee", "histoire", "храм", "пирамид", "фараон", "музей", "истор", "معبد", "هرم", "اهرام", "فرعون", "فراعن", "متحف", "تاريخ", "اثار", "مقبره"],
  market: ["market", "souk", "bazaar", "shopping", "old town", "marche", "markt", "basar", "рынок", "базар", "шопинг", "سوق", "تسوق", "بازار", "الدهار"],
  food: ["food", "cooking", "dinner", "lunch", "cuisine", "essen", "kochen", "abendessen", "еда", "ужин", "кухн", "обед", "اكل", "طبخ", "عشا", "غدا", "مطبخ"],
  family: ["family", "kid", "child", "famille", "enfant", "familie", "kinder", "семь", "дет", "ребен", "عائل", "اطفال", "طفل", "اسره"],
  spa: ["spa", "massage", "hammam", "wellness", "relax", "yoga", "meditat", "detente", "entspann", "массаж", "спа", "хамам", "йог", "релакс", "مساج", "سبا", "حمام", "يوجا", "استرخا"],
  water: ["jet ski", "jetski", "parasail", "kite", "surf", "paddle", "sup", "flyboard", "banana", "tube", "водн", "кайт", "серф", "جت سكي", "باراشوت", "كايت", "سيرف", "بانانا"],
  sunset: ["sunset", "sunrise", "coucher", "lever du soleil", "sonnenunter", "sonnenauf", "закат", "рассвет", "غروب", "شروق"],
  fishing: ["fishing", "angel", "peche", "рыбал", "صيد"],
  horse: ["horse", "cheval", "pferd", "reiten", "лошад", "конн", "حصان", "خيل"],
  balloon: ["balloon", "ballon", "montgolf", "heissluft", "воздушн", "шар", "منطاد", "بالون"],
  nile: ["nile", "felucca", "nil", "felouque", "feluke", "нил", "фелюк", "نيل", "فلوكه"],
  hike: ["hike", "hiking", "trek", "mountain", "randonnee", "montagne", "wander", "berg", "поход", "гор", "треккинг", "هايك", "جبل", "جبال", "مشي"],
  night: ["night", "evening", "show", "tanoura", "soiree", "nuit", "abend", "nacht", "вечер", "ночь", "шоу", "ليل", "سهره", "عرض", "تنوره"],
  private: ["private", "prive", "privat", "индивидуал", "частн", "خاص", "برايفت"],
  wreck: ["wreck", "epave", "wrack", "затонув", "سفينه غارقه", "حطام"],
  submarine: ["submarine", "glass", "sous marin", "u boot", "подводн", "стеклян", "غواصه", "زجاج"],
};
const IDEA_WORDS = Object.entries(IDEAS).map(([k, ws]) => [k, ws.map(norm)] as const);

export const CATEGORY_IDEAS: Record<string, string[]> = {
  sea: ["boat", "beach", "island"], diving: ["dive"], watersports: ["water", "beach"],
  desert: ["desert", "quad", "camel"], family: ["family"], evening: ["night", "food"], culture: ["history", "market"],
  daytrips: ["history"], wellness: ["spa"],
};
const THEME_IDEAS: Record<string, string[]> = { reef: ["boat"], desert: ["desert"], trail: ["hike"], heritage: ["history"], souk: ["market"], nile: ["nile", "boat"] };

// city names people type (all languages + common spellings)
const CITY_ALIASES: Record<string, string[]> = {
  hurghada: ["hurghada", "hurgada", "ghardaqa", "хургад", "الغردقه", "غردقه"], "el-gouna": ["gouna", "эль гуна", "гуна", "الجونه"],
  makadi: ["makadi", "макади", "مكادي"], "sahl-hasheesh": ["sahl hasheesh", "сахль", "سهل حشيش"], "soma-bay": ["soma bay", "сома", "سوما"],
  safaga: ["safaga", "сафага", "سفاجا"], "el-quseir": ["quseir", "qusair", "кусейр", "القصير"], "marsa-alam": ["marsa alam", "марса алам", "مرسي علم"],
  sharm: ["sharm", "charm", "шарм", "شرم"], dahab: ["dahab", "дахаб", "دهب"], nuweiba: ["nuweiba", "нувейба", "نويبع"],
  "st-catherine": ["catherine", "katharina", "катерин", "كاترين"], luxor: ["luxor", "louxor", "луксор", "الاقصر", "اقصر"],
  aswan: ["aswan", "assuan", "assouan", "асуан", "اسوان"], "abu-simbel": ["abu simbel", "abou simbel", "абу симбел", "ابو سمبل"],
  cairo: ["cairo", "caire", "kairo", "каир", "القاهره", "قاهره"], giza: ["giza", "gizeh", "гиза", "الجيزه", "جيزه"],
  alexandria: ["alexandria", "alexandrie", "александр", "الاسكندريه", "اسكندريه"], "marsa-matrouh": ["matrouh", "matruh", "матрух", "مطروح"],
  siwa: ["siwa", "сива", "سيوه"],
};
const CITY_WORDS = Object.entries(CITY_ALIASES).map(([k, ws]) => [k, ws.map(norm)] as const);

/** Edit distance (a swap of two letters counts as one typo), small values only. */
function close(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      best = Math.min(best, d[i][j]);
    }
    if (best > max) return false;
  }
  return d[a.length][b.length] <= max;
}
const tol = (w: string) => (w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0);
const wordHit = (q: string, w: string) => w.startsWith(q) || (q.length >= 4 && w.includes(q)) || (tol(q) > 0 && close(q, w.slice(0, q.length + 1), tol(q)) ) || (tol(q) > 0 && close(q, w, tol(q)));

export type Indexed = { card: ExperienceCard; words: string[]; title: string[]; ideas: Set<string>; text: string };

/** Build once per list: words and ideas for every trip. */
export function indexCards(cards: ExperienceCard[], extra?: (c: ExperienceCard) => string) {
  return cards.map((c): Indexed => {
    const title = norm(c.title ?? "").split(" ").filter(Boolean);
    const text = norm(`${c.title ?? ""} ${c.summary ?? ""} ${c.slug.replace(/-/g, " ")} ${extra ? extra(c) : ""}`);
    const ideas = new Set<string>([...(CATEGORY_IDEAS[c.category ?? ""] ?? []), ...(THEME_IDEAS[themeFor(c)] ?? [])]);
    for (const [k, ws] of IDEA_WORDS) if (ws.some((w) => text.includes(w))) ideas.add(k);
    return { card: c, words: text.split(" ").filter(Boolean), title, ideas, text };
  });
}

/** What the query asks for: ideas, a city, and the remaining free words. */
export function understand(q: string) {
  let text = ` ${norm(q)} `;
  let city: City | null = null, cityWords: string[] = [];
  for (const [slug, ws] of CITY_WORDS) for (const w of ws) if (text.includes(` ${w}`)) { city = CITIES.find((c) => c.slug === slug) ?? null; cityWords = ws; text = text.replace(` ${w}`, " "); }
  const words = text.trim().split(" ").filter((w) => w.length > 1);
  const ideas = words.map((w) => IDEA_WORDS.filter(([, ws]) => ws.some((x) => x.startsWith(w) || (w.length > x.length && w.startsWith(x)) || (tol(w) > 0 && close(w, x.slice(0, Math.max(w.length, x.length)), tol(w))))).map(([k]) => k));
  return { words, ideas, city, cityWords };
}

/** Ranked results. Every word must match (title, text or idea); a city keeps trips within ~90 km of it. */
export function search(index: Indexed[], q: string) {
  const u = understand(q);
  if (!u.words.length && !u.city) return null;
  const out: { card: ExperienceCard; score: number }[] = [];
  for (const it of index) {
    // a city: trips that start within ~90 km of it, or that go there ("Luxor day trip" from Hurghada)
    let score = 0;
    if (u.city) {
      const near = (tripDistance(u.city, it.card).km ?? 9999) <= 90;
      const named = u.cityWords.some((w) => it.words.some((t) => t.startsWith(w)) || it.text.includes(w));
      if (!near && !named) continue;
      score += named ? 4 : 2;
    }
    let ok = true;
    u.words.forEach((w, i) => {
      let s = 0;
      if (it.title.some((t) => t === w)) s = 6; else if (it.title.some((t) => t.startsWith(w))) s = 5;
      if (!s && tol(w) > 0 && it.title.some((t) => close(w, t, tol(w)))) s = 5;
      if (!s && u.ideas[i].some((k) => it.ideas.has(k))) s = 4;
      if (!s && it.words.some((t) => t.startsWith(w))) s = 2;
      if (!s && it.words.some((t) => wordHit(w, t))) s = 1;
      if (!s) ok = false; else score += s;
    });
    if (ok) out.push({ card: it.card, score });
  }
  return out.sort((a, b) => b.score - a.score).map((x) => x.card);
}

type Placed = { title?: string | null; summary?: string | null; slug?: string; lat?: number | null; lng?: number | null;
  city?: string | null; alat?: number | null; alng?: number | null };

/** Where the trip starts: its meeting point, else the centre of the city the operator chose. */
function startOf(c: Placed): { lat: number; lng: number } | null {
  if (c.lat != null && c.lng != null) return { lat: Number(c.lat), lng: Number(c.lng) };
  const city = c.city ? CITIES.find((x) => x.slug === c.city) : null;
  return city ? { lat: city.lat, lng: city.lng } : null;
}

/**
 * Where a trip actually goes, when that's far (> 120 km) from where it starts. The operator's activity pin
 * decides; without one, a city named in the title or summary does (a "Luxor day trip" meeting in Hurghada).
 */
export function destinationOf(c: Placed): { city: City; km: number } | null {
  const start = startOf(c);
  if (!start) return null;
  if (c.alat != null && c.alng != null) {
    const d = km(start.lat, start.lng, Number(c.alat), Number(c.alng));
    const n = nearestCity(Number(c.alat), Number(c.alng));
    return d > 120 && n ? { city: n.city, km: d } : null;
  }
  const text = ` ${norm(`${c.title ?? ""} ${c.summary ?? ""} ${(c.slug ?? "").replace(/-/g, " ")}`)} `;
  let best: { city: City; km: number } | null = null;
  for (const [slug, ws] of CITY_WORDS) {
    if (!ws.some((w) => text.includes(` ${w}`))) continue;
    const city = CITIES.find((x) => x.slug === slug);
    if (!city) continue;
    const d = km(start.lat, start.lng, city.lat, city.lng);
    if (d > 120 && (!best || d > best.km)) best = { city, km: d };
  }
  return best;
}

/** How far a trip really takes the guest from their city: where it starts, or where it goes when that's farther. */
export function tripDistance(from: City, c: Placed) {
  const start = startOf(c);
  if (!start) return { km: null as number | null, dest: null as City | null };
  const meet = km(from.lat, from.lng, start.lat, start.lng);
  const far = c.alat != null && c.alng != null ? km(from.lat, from.lng, Number(c.alat), Number(c.alng)) : 0;
  const dest = destinationOf(c);
  const toDest = dest ? km(from.lat, from.lng, dest.city.lat, dest.city.lng) : 0;
  return { km: Math.max(meet, far, toDest), dest: dest?.city ?? null };
}
