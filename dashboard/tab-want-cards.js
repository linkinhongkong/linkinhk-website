// ============================================================
// tab-want-cards.js — "我想要" card layouts
// ============================================================

// ---------------- Card configs ----------------
const WANT_CARD_CONFIGS = {
  basic: {
    title: "編輯 👤 基本條件",
    fields: [
      {
        type: "range",
        label: "年齡範圍",
        minKey: "their-age-min",
        maxKey: "their-age-max",
        unit: "歲",
        dealBreakerKey: "age",
      },
      {
        type: "range",
        label: "身高範圍",
        minKey: "their-height-min",
        maxKey: "their-height-max",
        unit: "cm",
        dealBreakerKey: "height",
      },
    ],
  },
  background: {
    title: "編輯 🎓 背景",
    fields: [
      { key: "their-occupation", label: "職業", type: "select", options: OPTIONS.occupation, dealBreakerKey: "occupation" },
      { key: "their-uni", label: "大學", type: "select", options: OPTIONS.university, dealBreakerKey: "uni" },
    ],
  },
  personality: {
    title: "編輯 🧠 個性 & 相處方式",
    fields: [
      { key: "their-MBTI", label: "MBTI", type: "select", options: OPTIONS.mbti, dealBreakerKey: "MBTI" },
      {
        key: "their-love-language",
        label: "愛的語言",
        type: "limitedmulti",
        options: OPTIONS.loveLanguage,
        max: 2,
        hint: "最多揀 2 項",
        dealBreakerKey: "love-language",
      },
    ],
  },
  lifestyle: {
    title: "編輯 🌿 生活方式",
    fields: [
      { key: "their-drinking-habbit", label: "飲酒習慣", type: "select", options: OPTIONS.drinking, dealBreakerKey: "drinking-habbit" },
      { key: "their-smoking-habbit", label: "吸煙習慣", type: "select", options: OPTIONS.smoking, dealBreakerKey: "smoking-habbit" },
    ],
  },
  relationship: {
    title: "編輯 💛 關係觀",
    fields: [
      { key: "their-kids-preferences", label: "對小朋友的想法", type: "select", options: OPTIONS.kids, dealBreakerKey: "kids-preferences" },
      { key: "their-religion", label: "宗教", type: "select", options: OPTIONS.religion, dealBreakerKey: "religion" },
    ],
  },
  extra: {
    title: "編輯 📝 額外要求",
    fields: [
      {
        key: "extra-requirements",
        label: "額外要求",
        type: "textarea",
        placeholder: "例如: 鍾意貓、夜貓子、鍾意行山...",
        noDealBreaker: true,
      },
    ],
  },
};

// ---------------- Deal-breaker chip (display) ----------------
function DealBreakerChip() {
  return (
    <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded-full ml-2">
      硬性篩選條件
    </span>
  );
}

// ---------------- Display row (for "我想要" cards) ----------------
function WantRow({ label, value, dealBreakerKey, dealBreakers, isRange, rangeMin, rangeMax, rangeUnit }) {
  const isDB = dealBreakerKey && dealBreakers.includes(dealBreakerKey);
  return (
    <div className="py-2.5 border-b border-stone-100 last:border-b-0">
      <div className="text-xs text-stone-500 mb-1 flex items-center flex-wrap">
        <span>{label}</span>
        {isDB && <DealBreakerChip />}
      </div>
      {isRange ? (
        <div className="text-stone-900">
          {rangeMin || "—"}{rangeUnit} <span className="text-stone-400 mx-1">至</span> {rangeMax || "—"}{rangeUnit}
        </div>
      ) : (
        <div className="text-stone-900 break-words">
          {value || <span className="text-stone-300">—</span>}
        </div>
      )}
    </div>
  );
}

// ---------------- Main "我想要" tab ----------------
function WhatIWant({ profile, dealBreakers, onProfileUpdated }) {
  const [editingCard, setEditingCard] = useState(null);

  const openSheet = (cardKey) => setEditingCard(cardKey);
  const closeSheet = () => setEditingCard(null);

  return (
    <div className="fade-in">
      {/* ---------- 基本條件 ---------- */}
      <Card icon="👤" title="基本條件" onEdit={() => openSheet("basic")}>
        <WantRow
          label="年齡範圍"
          isRange
          rangeMin={profile["their-age-min"]}
          rangeMax={profile["their-age-max"]}
          rangeUnit="歲"
          dealBreakerKey="age"
          dealBreakers={dealBreakers}
        />
        <WantRow
          label="身高範圍"
          isRange
          rangeMin={profile["their-height-min"]}
          rangeMax={profile["their-height-max"]}
          rangeUnit="cm"
          dealBreakerKey="height"
          dealBreakers={dealBreakers}
        />
      </Card>

      {/* ---------- 背景 ---------- */}
      <Card icon="🎓" title="背景" onEdit={() => openSheet("background")}>
        <WantRow label="職業" value={profile["their-occupation"]} dealBreakerKey="occupation" dealBreakers={dealBreakers} />
        <WantRow label="大學" value={profile["their-uni"]} dealBreakerKey="uni" dealBreakers={dealBreakers} />
      </Card>

      {/* ---------- 個性 & 相處方式 ---------- */}
      <Card icon="🧠" title="個性 & 相處方式" onEdit={() => openSheet("personality")}>
        <WantRow label="MBTI" value={profile["their-MBTI"]} dealBreakerKey="MBTI" dealBreakers={dealBreakers} />
        <WantRow label="愛的語言" value={profile["their-love-language"]} dealBreakerKey="love-language" dealBreakers={dealBreakers} />
      </Card>

      {/* ---------- 生活方式 ---------- */}
      <Card icon="🌿" title="生活方式" onEdit={() => openSheet("lifestyle")}>
        <WantRow label="飲酒習慣" value={profile["their-drinking-habbit"]} dealBreakerKey="drinking-habbit" dealBreakers={dealBreakers} />
        <WantRow label="吸煙習慣" value={profile["their-smoking-habbit"]} dealBreakerKey="smoking-habbit" dealBreakers={dealBreakers} />
      </Card>

      {/* ---------- 關係觀 ---------- */}
      <Card icon="💛" title="關係觀" onEdit={() => openSheet("relationship")}>
        <WantRow label="對小朋友的想法" value={profile["their-kids-preferences"]} dealBreakerKey="kids-preferences" dealBreakers={dealBreakers} />
        <WantRow label="宗教" value={profile["their-religion"]} dealBreakerKey="religion" dealBreakers={dealBreakers} />
      </Card>

      {/* ---------- 額外要求 ---------- */}
      <Card icon="📝" title="額外要求" onEdit={() => openSheet("extra")}>
        <WantRow label="額外要求" value={profile["extra-requirements"]} />
      </Card>

      {/* ---------- Bottom sheet ---------- */}
      {editingCard && (
        <WantBottomSheet
          open={true}
          title={WANT_CARD_CONFIGS[editingCard].title}
          fields={WANT_CARD_CONFIGS[editingCard].fields}
          profile={profile}
          onClose={closeSheet}
          onSaved={onProfileUpdated}
        />
      )}
    </div>
  );
}
