// ============================================================
// form-options.js — option lists extracted from signup form
//
// Storage convention: options are stored in DB as "icon+label"
// (e.g. "🏦金融／銀行") to match what the signup form writes.
// No IDs used here — matching is done by display string.
//
// If you ever want to migrate to ID-based storage, you'd:
//   1. add `id` to each option
//   2. change saveValueOf to return the id
//   3. change findOption to match on id
//   4. migrate existing Airtable data
// ============================================================

// ---------------- Single-select options ----------------
const OPTIONS = {
  sex: [
    { icon: "👨", label: "男" },
    { icon: "👩", label: "女" },
  ],
  occupation: [
    { icon: "🏦", label: "金融／銀行" },
    { icon: "📊", label: "商業／市場" },
    { icon: "👨‍💻", label: "IT／科技" },
    { icon: "🎨", label: "設計／創意" },
    { icon: "📚", label: "教育" },
    { icon: "🏥", label: "醫療" },
    { icon: "🏗", label: "工程" },
    { icon: "⚖️", label: "法律" },
    { icon: "🧮", label: "會計" },
    { icon: "🍽", label: "服務業" },
    { icon: "✨", label: "自僱／創業" },
    { icon: "🎓", label: "學生" },
    { icon: "💼", label: "其他" },
  ],
  university: [
    { icon: "", label: "香港大學" },
    { icon: "", label: "中文大學" },
    { icon: "", label: "科技大學" },
    { icon: "", label: "理工大學" },
    { icon: "", label: "城市大學" },
    { icon: "", label: "浸會大學" },
    { icon: "", label: "嶺南大學" },
    { icon: "", label: "教育大學" },
    { icon: "", label: "都會大學" },
    { icon: "", label: "樹仁大學" },
    { icon: "", label: "恒生大學" },
    { icon: "", label: "聖方濟各大學" },
    { icon: "", label: "其它" },
  ],
  religion: [
    { icon: "", label: "無信仰" },
    { icon: "", label: "基督教" },
    { icon: "", label: "天主教" },
    { icon: "", label: "佛教" },
    { icon: "", label: "道教" },
    { icon: "", label: "其它" },
  ],
  mbti: [
    "INTJ", "INTP", "ENTJ", "ENTP",
    "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ",
    "ISTP", "ISFP", "ESTP", "ESFP",
  ].map(t => ({ icon: "", label: t })).concat([{ icon: "", label: "不清楚" }]),
  loveLanguage: [
    { icon: "💬", label: "肯定的言語" },
    { icon: "⏰", label: "精心時刻" },
    { icon: "🎁", label: "接受禮物" },
    { icon: "🔧", label: "服務行動" },
    { icon: "🤝", label: "身體接觸" },
  ],
  drinking: [
    { icon: "", label: "唔飲 / 唔係好飲" },
    { icon: "", label: "社交場合會飲，覺得係一種氣氛" },
    { icon: "", label: "享受飲酒本身，例如小酌、bar / wine" },
  ],
  smoking: [
    { icon: "", label: "唔吸煙" },
    { icon: "", label: "社交場合會吸，例如 vape / shisha" },
    { icon: "", label: "有吸煙習慣（香煙 / vape）" },
  ],
  kids: [
    { icon: "", label: "希望將來有" },
    { icon: "", label: "傾向有，但仍然保持開放" },
    { icon: "", label: "傾向無，但仍然保持開放" },
    { icon: "", label: "唔考慮有小朋友" },
  ],
};

// ---------------- Multi-select: hobbies (grouped) ----------------
const HOBBY_GROUPS = {
  "運動／戶外": [
    { icon: "🥾", label: "行山／遠足" },
    { icon: "🏋️", label: "健身／瑜伽" },
    { icon: "🏃", label: "跑步／單車" },
    { icon: "🏀", label: "球類運動" },
  ],
  "文化／藝術": [
    { icon: "🎵", label: "音樂／演唱會" },
    { icon: "📖", label: "閱讀" },
    { icon: "🎨", label: "藝術展覽" },
    { icon: "📸", label: "攝影" },
  ],
  "生活品味": [
    { icon: "☕", label: "咖啡文化" },
    { icon: "🍽", label: "美食探店" },
    { icon: "🍳", label: "煮飯／烘焙" },
    { icon: "✈️", label: "旅行" },
    { icon: "🐾", label: "寵物" },
  ],
  "娛樂休閒": [
    { icon: "🎮", label: "打機" },
    { icon: "🎲", label: "桌遊" },
    { icon: "🎤", label: "唱K" },
    { icon: "📺", label: "睇劇" },
  ],
};

// ---------------- Multi-select: activities (grouped, with Other) ----------------
const ACTIVITY_GROUPS = {
  "☕️ 輕鬆chill型": [
    { icon: "☕️", label: "飲咖啡／輕鬆傾下計" },
    { icon: "🍰", label: "食甜品／cafe hopping" },
    { icon: "🌇", label: "散步／海邊chill下" },
  ],
  "🎨 有互動但唔尷尬": [
    { icon: "🎨", label: "一齊做手作（陶瓷／畫畫）" },
    { icon: "🎲", label: "玩board game／輕鬆小遊戲" },
    { icon: "🛍️", label: "行市集／睇展覽" },
  ],
  "🎯 活動型（快啲破冰）": [
    { icon: "🏹", label: "射箭／小運動" },
    { icon: "🛼", label: "Roller／室內活動" },
    { icon: "🎮", label: "VR／遊戲體驗" },
  ],
  "🍷 深入交流型": [
    { icon: "🍷", label: "飲酒傾計" },
    { icon: "🌌", label: "有主題嘅深度對話（人生／感情）" },
  ],
};

// ---------------- Helpers ----------------

// Convert an option { icon, label } to the string stored in the DB.
// Signup form concatenates without a space: "🏦" + "金融／銀行" = "🏦金融／銀行"
function optionToStored(opt) {
  return (opt.icon || "") + (opt.label || "");
}

// Given a stored string from DB and an options array, find matching option.
// Returns null if no match (treat as "nothing selected").
function findOption(storedValue, options) {
  if (!storedValue) return null;
  const normalized = String(storedValue).trim();
  return options.find(opt => optionToStored(opt) === normalized) || null;
}

// For multi-select fields stored as comma-separated strings in DB
// (e.g. my-hobby = "📖閱讀, 🎮打機"), split and match each.
// Returns an array of matched option objects.
function findOptionsFromCSV(storedValue, flatOptions) {
  if (!storedValue) return [];
  const parts = String(storedValue).split(",").map(s => s.trim()).filter(Boolean);
  return parts
    .map(part => flatOptions.find(opt => optionToStored(opt) === part))
    .filter(Boolean);
}

// Convert an array of option objects back to a CSV string for DB storage.
// Signup form uses ", " as the separator. We match that exactly.
function optionsToCSV(optionsArray) {
  return optionsArray.map(optionToStored).join(", ");
}

// Flatten grouped options (for hobbies/activities) into a single array
function flattenGroups(groups) {
  return Object.values(groups).flat();
}

const ALL_HOBBIES = flattenGroups(HOBBY_GROUPS);
const ALL_ACTIVITIES = flattenGroups(ACTIVITY_GROUPS);
