/**
 * Privacy policy and terms of use. Written from what the platform actually does (data, cookies, providers).
 * DRAFT: a lawyer should review both before launch (Egyptian data-protection law 151/2020, EU GDPR for EU
 * guests). German, Russian and French visitors see the English text until translations are reviewed.
 */
export type LegalDoc = { title: string; updated: string; intro: string; sections: { h: string; p: string[] }[] };

const CONTACT = "support@wenro.site";

const privacy: Record<"en" | "ar", LegalDoc> = {
  en: {
    title: "Privacy policy",
    updated: "Last updated: 21 November 2026",
    intro: `WENRO (wenro.site) lists local experiences in Egypt run by licensed operators, and takes bookings for them. This page explains what personal data we collect, why, who we share it with, and your rights. Questions: ${CONTACT}.`,
    sections: [
      { h: "What we collect", p: [
        "When you book: your name, email, phone number (with country code), number of guests, hotel or pickup details if you ask for a transfer, any note you write, and whether you want WhatsApp messages.",
        "When you sign in (operators, agencies, marketers, WENRO staff): your email, the username you choose, and your role in a workspace. If you sign in with Google we receive your name, email and Google account id. Passwords are stored hashed by our sign-in provider; WENRO never sees them.",
        "When you write a review after a trip: the review text, rating and a short form of your name.",
        "Partners applying to join: business name, contact person, phone, licence details and payout account (for example an InstaPay address).",
      ] },
      { h: "Why we use it", p: [
        "To make and manage your booking, send confirmations and reminders, and let the operator run the trip.",
        "To pay partners their commission and keep financial records that the law requires us to keep.",
        "To keep accounts secure (rate limits, sign-in codes) and to stop fraud and abuse.",
        "We count page visits without cookies and without storing personal data. We do not sell your data and we do not use it for advertising.",
      ] },
      { h: "Who we share it with", p: [
        "The operator of the experience you booked (and the agency or marketer who referred you, without your contact details unless needed for the trip).",
        "Service providers who process data for us: Vercel (website hosting), Supabase (database and sign-in), Resend (email), Meta (WhatsApp messages, only if you opt in), Cloudinary (trip photos), Google (only if you choose to sign in with Google). Maps load tiles from OpenStreetMap.",
        "Authorities, when the law requires it.",
      ] },
      { h: "Cookies and local storage", p: [
        "Necessary cookies keep you signed in, and remember for 30 days which partner link you arrived from (so the right partner earns the commission).",
        "Your wishlist, recently viewed trips and chosen city are stored only in your browser.",
        "We do not use advertising or third-party tracking cookies.",
      ] },
      { h: "How long we keep it", p: [
        "Booking and payment records are kept as long as accounting and tax law requires. Price and payment records are never edited after the fact. Other data is deleted or anonymised when it is no longer needed.",
      ] },
      { h: "Your rights", p: [
        `You can ask to see, correct or delete your data, or object to its use, by writing to ${CONTACT}. Some records (for example invoices) must be kept by law. You can also complain to the data-protection authority in your country.`,
      ] },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: 21 نوفمبر 2026",
    intro: `WENRO (wenro.site) بتعرض تجارب محلية في مصر بينفذها منفّذين مرخّصين، وبتاخد الحجوزات ليها. الصفحة دي بتوضح بنجمع إيه من بياناتك الشخصية، وليه، وبنشاركها مع مين، وإيه حقوقك. لأي سؤال: ${CONTACT}.`,
    sections: [
      { h: "بنجمع إيه", p: [
        "لما تحجز: اسمك، وإيميلك، ورقم تليفونك بكود الدولة، وعدد الضيوف، وبيانات الفندق أو مكان التوصيل لو طلبت توصيل، وأي ملاحظة تكتبها، وهل عايز رسايل واتساب ولا لأ.",
        "لما تسجّل دخول (منفّذين، ووكالات، ومسوّقين، وفريق WENRO): إيميلك، واسم المستخدم اللي تختاره، ودورك في الحساب. لو دخلت بحساب Google بيوصلنا اسمك وإيميلك ورقم حسابك في Google. كلمات السر محفوظة بشكل مشفّر عند مزوّد تسجيل الدخول، وWENRO مبتشوفهاش.",
        "لما تكتب تقييم بعد الرحلة: نص التقييم، والنجوم، واسمك المختصر.",
        "الشركاء اللي بيقدّموا للانضمام: اسم النشاط، والشخص المسؤول، والتليفون، وبيانات الرخصة، وحساب استلام الفلوس (زي عنوان إنستاباي).",
      ] },
      { h: "بنستخدمها في إيه", p: [
        "عشان نعمل حجزك وندير، ونبعتلك التأكيد والتذكير، والمنفّذ يقدر ينفّذ الرحلة.",
        "عشان نصرف للشركاء عمولاتهم، ونحتفظ بالسجلات المالية اللي القانون بيطلبها.",
        "عشان نحمي الحسابات (حدود المحاولات وأكواد الدخول) ونمنع النصب وسوء الاستخدام.",
        "بنعدّ زيارات الصفحات من غير كوكيز ومن غير ما نحفظ بيانات شخصية. مش بنبيع بياناتك، ومش بنستخدمها في إعلانات.",
      ] },
      { h: "بنشاركها مع مين", p: [
        "منفّذ التجربة اللي حجزتها (والوكالة أو المسوّق اللي جابك، من غير بيانات التواصل بتاعتك إلا لو الرحلة محتاجاها).",
        "مزوّدي خدمات بيشغّلوا البيانات لحسابنا: Vercel (استضافة الموقع)، وSupabase (قاعدة البيانات وتسجيل الدخول)، وResend (الإيميل)، وMeta (رسايل واتساب لو وافقت بس)، وCloudinary (صور الرحلات)، وGoogle (لو اخترت تدخل بحساب Google بس). الخرائط بتحمّل صورها من OpenStreetMap.",
        "الجهات الرسمية، لما القانون يطلب ده.",
      ] },
      { h: "الكوكيز والتخزين في المتصفح", p: [
        "كوكيز ضرورية بتخليك مسجّل دخول، وبتفتكر لمدة 30 يوم انت جيت من لينك أنهي شريك (عشان العمولة تروح للشريك الصح).",
        "قايمة المفضلة، والرحلات اللي شفتها، والمدينة اللي اخترتها، متخزنين في متصفحك بس.",
        "مش بنستخدم كوكيز إعلانات أو تتبّع من جهات تانية.",
      ] },
      { h: "بنحتفظ بيها قد إيه", p: [
        "سجلات الحجز والدفع بنحتفظ بيها المدة اللي قوانين المحاسبة والضرايب بتطلبها، وسجلات الأسعار والمدفوعات مبتتعدّلش بعد كده. باقي البيانات بتتمسح أو تتحوّل لمجهولة لما مانحتاجهاش.",
      ] },
      { h: "حقوقك", p: [
        `تقدر تطلب تشوف بياناتك أو تصحّحها أو تمسحها، أو تعترض على استخدامها، بإيميل على ${CONTACT}. فيه سجلات (زي الفواتير) القانون بيلزمنا نحتفظ بيها. وتقدر كمان تشتكي لجهة حماية البيانات في بلدك.`,
      ] },
    ],
  },
};

const terms: Record<"en" | "ar", LegalDoc> = {
  en: {
    title: "Terms of use",
    updated: "Last updated: 21 November 2026",
    intro: `These terms apply to using wenro.site and booking experiences through it. Questions: ${CONTACT}.`,
    sections: [
      { h: "What WENRO does", p: [
        "WENRO is a booking platform. Each experience is run by an independent licensed operator, who is responsible for the trip itself, its safety and its licences.",
      ] },
      { h: "Bookings and payment", p: [
        "The price shown when you book is the price you pay; it is saved with your booking. Unless the page says otherwise you pay the operator in cash at the start of the trip.",
        "Some experiences are confirmed instantly; others need the operator to accept within 12 hours. If they do not, the request ends and you are told.",
        "Please confirm your attendance when we ask, so your seats are kept.",
      ] },
      { h: "Cancellations", p: [
        "Each experience shows its own cancellation rule before you book. That rule applies to your booking.",
        "If the operator cancels (for example because of weather), you do not pay and you are told as soon as possible.",
      ] },
      { h: "Reviews", p: [
        "Only guests whose attendance was recorded can review a trip. We never write or edit reviews, and we do not hide a review only because it is negative. We hide abuse, personal data, spam and content unrelated to the trip.",
      ] },
      { h: "Partner accounts", p: [
        "Operators, agencies and marketers must give accurate details and hold the licences their work requires. WENRO may pause an account after a complaint or a breach of these terms. Commission and payout rules are shown in each partner dashboard.",
      ] },
      { h: "Liability", p: [
        "WENRO is responsible for the booking service. The operator is responsible for running the experience. Nothing in these terms limits rights you have under consumer-protection law.",
      ] },
    ],
  },
  ar: {
    title: "شروط الاستخدام",
    updated: "آخر تحديث: 21 نوفمبر 2026",
    intro: `الشروط دي بتنطبق على استخدام wenro.site والحجز من خلاله. لأي سؤال: ${CONTACT}.`,
    sections: [
      { h: "WENRO بتعمل إيه", p: [
        "WENRO منصة حجز. كل تجربة بينفّذها منفّذ مستقل ومرخّص، وهو المسؤول عن الرحلة نفسها وأمانها وتراخيصها.",
      ] },
      { h: "الحجز والدفع", p: [
        "السعر اللي بيظهرلك وقت الحجز هو اللي هتدفعه، وبيتحفظ مع حجزك. إلا لو الصفحة قالت غير كده، بتدفع للمنفّذ كاش في بداية الرحلة.",
        "فيه تجارب بتتأكد على طول، وفيه تجارب المنفّذ لازم يقبلها خلال 12 ساعة. لو ماقبلهاش، الطلب بينتهي وبنبلّغك.",
        "من فضلك أكّد حضورك لما نطلب منك، عشان مقاعدك تفضل محجوزة.",
      ] },
      { h: "الإلغاء", p: [
        "كل تجربة بتوضح قاعدة الإلغاء بتاعتها قبل ما تحجز، والقاعدة دي هي اللي بتنطبق على حجزك.",
        "لو المنفّذ لغى (مثلًا بسبب الجو)، مش بتدفع حاجة وبنبلّغك في أسرع وقت.",
      ] },
      { h: "التقييمات", p: [
        "بس الضيوف اللي اتسجّل حضورهم يقدروا يقيّموا الرحلة. إحنا عمرنا ما بنكتب أو نعدّل تقييم، ومش بنخفي تقييم عشان هو سلبي. بنخفي الإساءة، والبيانات الشخصية، والسبام، والكلام اللي ملوش علاقة بالرحلة.",
      ] },
      { h: "حسابات الشركاء", p: [
        "المنفّذين والوكالات والمسوّقين لازم يدّوا بيانات صحيحة ويكون معاهم التراخيص اللي شغلهم محتاجها. WENRO ممكن توقف أي حساب بعد شكوى أو مخالفة للشروط دي. قواعد العمولات والصرف موجودة في لوحة كل شريك.",
      ] },
      { h: "المسؤولية", p: [
        "WENRO مسؤولة عن خدمة الحجز، والمنفّذ مسؤول عن تنفيذ التجربة. ومفيش حاجة في الشروط دي بتقلّل من حقوقك في قانون حماية المستهلك.",
      ] },
    ],
  },
};

export function legalDoc(kind: "privacy" | "terms", locale: string): LegalDoc {
  const set = kind === "privacy" ? privacy : terms;
  return locale === "ar" ? set.ar : set.en;
}
