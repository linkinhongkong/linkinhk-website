// ============================================================
// shared-options.js — Single source of truth for all option lists
//
// Lives in /shared/ and is loaded by:
//   - /dashboard/index.html   (before form-options.js)
//   - /member-form/index.html (before its inline script)
//   - /ideal-form/index.html  (before form-options.js)
//
// DB storage conventions (set by the signup form):
//   Occupation:  icon + label (no space)  → "🏦金融／銀行"
//   University:  label only               → "香港大學"
//   Hobby:       icon + label (no space)  → "🥾行山／遠足"
//   Activity:    icon + " " + label       → "☕️ 飲咖啡／輕鬆傾下計"
//   Others:      label only               → "唔吸煙"
// ============================================================

var SHARED_OCCUPATIONS = [
  { id: "finance", label: "金融／銀行", icon: "🏦" },
  { id: "business", label: "商業／市場", icon: "📊" },
  { id: "it", label: "IT／科技", icon: "👨‍💻" },
  { id: "design", label: "設計／創意", icon: "🎨" },
  { id: "education", label: "教育", icon: "📚" },
  { id: "medical", label: "醫療", icon: "🏥" },
  { id: "engineering", label: "工程", icon: "🏗" },
  { id: "legal", label: "法律", icon: "⚖️" },
  { id: "accounting", label: "會計", icon: "🧮" },
  { id: "service", label: "服務業", icon: "🍽" },
  { id: "uniform", label: "制服團隊", icon: "👮" },
  { id: "pilot", label: "機師", icon: "✈️" },
  { id: "freelance", label: "自僱／創業", icon: "✨" },
  { id: "student", label: "學生", icon: "🎓" },
  { id: "other_occ", label: "其他", icon: "💼" },
];

var SHARED_UNIVERSITIES = [
  { id: "hku", label: "香港大學" },
  { id: "cuhk", label: "中文大學" },
  { id: "ust", label: "科技大學" },
  { id: "polyu", label: "理工大學" },
  { id: "cityu", label: "城市大學" },
  { id: "bu", label: "浸會大學" },
  { id: "lingnan", label: "嶺南大學" },
  { id: "eduhk", label: "教育大學" },
  { id: "hkmu", label: "都會大學" },
  { id: "shue_yan", label: "樹仁大學" },
  { id: "hsu", label: "恒生大學" },
  { id: "sfu", label: "聖方濟各大學" },
  { id: "overseas", label: "海外升學" },
  { id: "other_uni", label: "其他" },
];

var SHARED_RELIGIONS = [
  { id: "none", label: "無信仰" },
  { id: "christian", label: "基督教" },
  { id: "catholic", label: "天主教" },
  { id: "buddhist", label: "佛教" },
  { id: "taoist", label: "道教" },
  { id: "other_religion", label: "其他" },
];

var SHARED_MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

var SHARED_MBTI_COLORS = {
  INTJ: "🟣", INTP: "🟣", ENTJ: "🔴", ENTP: "🔴",
  INFJ: "🟢", INFP: "🟢", ENFJ: "🟢", ENFP: "🟢",
  ISTJ: "🔵", ISFJ: "🔵", ESTJ: "🔵", ESFJ: "🔵",
  ISTP: "🟡", ISFP: "🟡", ESTP: "🟡", ESFP: "🟡",
};

var SHARED_LOVE_LANGUAGES = [
  { id: "words", label: "肯定的言語", en: "Words of Affirmation", icon: "💬" },
  { id: "time", label: "精心時刻", en: "Quality Time", icon: "⏰" },
  { id: "gifts", label: "接受禮物", en: "Receiving Gifts", icon: "🎁" },
  { id: "service", label: "服務行動", en: "Acts of Service", icon: "🔧" },
  { id: "touch", label: "身體接觸", en: "Physical Touch", icon: "🤝" },
];

var SHARED_INTERESTS = {
  "運動／戶外": [
    { id: "hiking", label: "行山／遠足", icon: "🥾" },
    { id: "gym", label: "健身", icon: "🏋️" },
    { id: "yoga", label: "瑜伽", icon: "🧘" },
    { id: "pilates", label: "Pilates", icon: "🤸" },
    { id: "running", label: "跑步", icon: "🏃" },
    { id: "cycling", label: "單車", icon: "🚴" },
    { id: "swimming", label: "游水", icon: "🏊" },
    { id: "football", label: "足球", icon: "⚽" },
    { id: "basketball", label: "籃球", icon: "🏀" },
    { id: "pickleball", label: "匹克球", icon: "🏓" },
    { id: "badminton", label: "羽毛球", icon: "🏸" },
    { id: "table_tennis", label: "乒乓球", icon: "🏓" },
    { id: "tennis", label: "網球", icon: "🎾" },
    { id: "thai_boxing", label: "泰拳", icon: "🥊" },
    { id: "bowling", label: "保齡球", icon: "🎳" },
    { id: "golf", label: "高爾夫", icon: "⛳" },
    { id: "ice_hockey", label: "冰球", icon: "🏒" },
    { id: "snowboarding", label: "滑雪", icon: "🏂" },
    { id: "wakesurf", label: "無繩滑水", icon: "🏄" },
  ],
  "文化／藝術": [
    { id: "music", label: "音樂／演唱會", icon: "🎵" },
    { id: "reading", label: "閱讀", icon: "📖" },
    { id: "art", label: "藝術展覽", icon: "🎨" },
    { id: "photo", label: "攝影", icon: "📸" },
    { id: "dancing", label: "跳舞", icon: "💃" },
  ],
  "生活品味": [
    { id: "coffee", label: "咖啡文化", icon: "☕" },
    { id: "foodie", label: "美食探店", icon: "🍽" },
    { id: "cooking", label: "煮飯／烘焙", icon: "🍳" },
    { id: "travel", label: "旅行", icon: "✈️" },
    { id: "cats", label: "貓", icon: "🐱" },
    { id: "dogs", label: "狗", icon: "🐶" },
  ],
  "娛樂休閒": [
    { id: "gaming", label: "打機", icon: "🎮" },
    { id: "board_games", label: "桌遊", icon: "🎲" },
    { id: "karaoke", label: "唱K", icon: "🎤" },
    { id: "netflix", label: "Netflix", icon: "📺" },
    { id: "cinema", label: "睇戲", icon: "🎬" },
  ],
};

var SHARED_ACTIVITIES = {
  "☕️ 輕鬆chill型": [
    { id: "coffee_chat", label: "飲咖啡／輕鬆傾下計", icon: "☕️" },
    { id: "dessert_cafe", label: "食甜品／cafe hopping", icon: "🍰" },
    { id: "dinner", label: "食晚飯", icon: "🍽️" },
    { id: "walk_seaside", label: "散步／海邊chill下", icon: "🌇" },
  ],
  "🎨 有互動但唔尷尬": [
    { id: "handcraft", label: "一齊做手作（陶瓷／畫畫）", icon: "🎨" },
    { id: "board_game", label: "玩board game／輕鬆小遊戲", icon: "🎲" },
    { id: "market_exhibit", label: "行市集／睇展覽", icon: "🛍️" },
  ],
  "🎯 活動型（快啲破冰）": [
    { id: "archery_sport", label: "射箭／小運動", icon: "🏹" },
    { id: "roller_indoor", label: "Roller／室內活動", icon: "🛼" },
    { id: "vr_game", label: "VR／遊戲體驗", icon: "🎮" },
  ],
  "🍷 深入交流型": [
    { id: "drink_chat", label: "飲酒傾計", icon: "🍷" },
    { id: "deep_talk", label: "有主題嘅深度對話（人生／感情）", icon: "🌌" },
  ],
};

var SHARED_DRINKING = [
  { id: "no", label: "唔飲 / 唔係好飲" },
  { id: "social", label: "社交場合會飲，覺得係一種氣氛" },
  { id: "enjoy", label: "享受飲酒本身，例如小酌、bar / wine" },
];

var SHARED_SMOKING = [
  { id: "no", label: "唔吸煙" },
  { id: "social", label: "社交場合會吸，例如 vape / shisha" },
  { id: "yes", label: "有吸煙習慣（香煙 / vape）" },
];

var SHARED_KIDS = [
  { id: "want", label: "希望將來有" },
  { id: "lean_yes", label: "傾向有，但仍然保持開放" },
  { id: "lean_no", label: "傾向無，但仍然保持開放" },
  { id: "no", label: "唔考慮有小朋友" },
];

var SHARED_SEXUAL_ORIENTATION = [
  { id: "straight", label: "異性戀" },
  { id: "gay", label: "同性戀" },
  { id: "bisexual", label: "雙性戀" },
];
