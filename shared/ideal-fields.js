// ============================================================
// shared/ideal-fields.js — single source of truth for the
// ideal-type ("理想型") schema.
//
// Consumed by:
//   - dashboard/tab-want-cards.js   (read-only cards)
//   - shared/components.js → WantBottomSheet (edit sheet)
//   - ideal-form/index.html         (multi-step fill flow)
//
// Requires: shared-options.js + form-options.js loaded first
//           (provides global OPTIONS.*).
// ============================================================

var IDEAL_PRIORITY_OPTIONS = [
  { id: "appearance",  label: "外在",   helper: "樣貌、身高、年齡帶來的第一感覺" },
  { id: "personality", label: "性格",   helper: "興趣、相處方式、MBTI 或愛的語言" },
  { id: "background",  label: "背景",   helper: "工作、學歷，以及生活的軌跡" },
  { id: "values",      label: "價值觀", helper: "關於習慣與選擇，例如吸煙、飲酒、家庭觀念或宗教" },
];

var IDEAL_FIELDS = [
  {
    cardKey: "priorities",
    icon: "⭐",
    title: "你最重視嘅野",
    subtitle: "排序你揀對象嘅優先次序 ⭐",
    helper: "由最重要 (1) 排到最唔重要 (4)",
    fields: [
      {
        key: "my-priorities",
        label: "排序",
        type: "rank-id",
        options: IDEAL_PRIORITY_OPTIONS,
        helper: "由最重要 (1) 排到最唔重要 (4)",
        noDealBreaker: true,
      },
    ],
  },
  {
    cardKey: "basic",
    icon: "👤",
    title: "基本條件",
    subtitle: "年齡同身高嘅範圍 👤",
    fields: [
      { type: "range", label: "年齡範圍", minKey: "their-age-min",    maxKey: "their-age-max",    unit: "歲", dealBreakerKey: "age" },
      { type: "range", label: "身高範圍", minKey: "their-height-min", maxKey: "their-height-max", unit: "cm", dealBreakerKey: "height" },
    ],
  },
  {
    cardKey: "background",
    icon: "🎓",
    title: "背景",
    subtitle: "職業同教育背景 🎓",
    fields: [
      { key: "their-occupation", label: "職業 (可多選)", type: "flatmulti", options: OPTIONS.occupation, dealBreakerKey: "occupation" },
      { key: "their-uni",        label: "大學 (可多選)", type: "flatmulti", options: OPTIONS.university, dealBreakerKey: "uni" },
    ],
  },
  {
    cardKey: "personality",
    icon: "🧠",
    title: "個性 & 相處方式",
    subtitle: "MBTI 同愛嘅語言 🧠",
    fields: [
      { key: "their-MBTI",          label: "MBTI (可多選)", type: "flatmulti",    options: OPTIONS.mbti,         dealBreakerKey: "MBTI" },
      { key: "their-love-language", label: "愛的語言",       type: "limitedmulti", options: OPTIONS.loveLanguage, max: 2, hint: "最多揀 2 項", dealBreakerKey: "love-language" },
    ],
  },
  {
    cardKey: "lifestyle",
    icon: "🌿",
    title: "生活方式",
    subtitle: "飲酒同吸煙習慣 🌿",
    fields: [
      { key: "their-drinking-habbit", label: "飲酒習慣 (可多選)", type: "flatmulti", options: OPTIONS.drinking, dealBreakerKey: "drinking-habbit" },
      { key: "their-smoking-habbit",  label: "吸煙習慣 (可多選)", type: "flatmulti", options: OPTIONS.smoking,  dealBreakerKey: "smoking-habbit"  },
    ],
  },
  {
    cardKey: "relationship",
    icon: "💛",
    title: "關係觀",
    subtitle: "對小朋友同宗教嘅想法 💛",
    fields: [
      { key: "their-kids-preferences", label: "對小朋友的想法 (可多選)", type: "flatmulti", options: OPTIONS.kids,     dealBreakerKey: "kids-preferences" },
      { key: "their-religion",         label: "宗教 (可多選)",            type: "flatmulti", options: OPTIONS.religion, dealBreakerKey: "religion" },
    ],
  },
  {
    cardKey: "extra",
    icon: "📝",
    title: "額外要求",
    subtitle: "講多啲你理想中嘅另一半 📝",
    fields: [
      { key: "extra-requirements", label: "額外要求", type: "textarea", placeholder: "例如: 鐘意貓、夜貓子、鐘意行山...", noDealBreaker: true },
    ],
  },
];

// ---------------- Helpers ----------------

// Collect every profile key that any IDEAL_FIELDS entry writes to.
function collectIdealKeys() {
  var keys = [];
  IDEAL_FIELDS.forEach(function (card) {
    card.fields.forEach(function (f) {
      if (f.type === "range") {
        keys.push(f.minKey, f.maxKey);
      } else {
        keys.push(f.key);
      }
    });
  });
  return keys;
}

// True iff every ideal-type field on the profile is empty/missing.
function isIdealEmpty(profile) {
  if (!profile) return true;
  var keys = collectIdealKeys();
  return keys.every(function (k) {
    var v = profile[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

// Look up a card config by cardKey.
function getIdealCard(cardKey) {
  return IDEAL_FIELDS.find(function (c) { return c.cardKey === cardKey; }) || null;
}
