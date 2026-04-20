// ============================================================
// tab-profile-cards.js — WhoIAm and WhatIWant card layouts
// ============================================================

// ---------------- Card edit configs (for bottom sheets) ----------------
const PROFILE_CARD_CONFIGS = {
  summary: {
    title: "編輯個人簡介",
    fields: [
      { key: "name", label: "姓名" },
      // my-age is read-only — not included in edit fields
      { key: "my-occupation", label: "職業", type: "select", options: OPTIONS.occupation },
      { key: "my-uni", label: "大學", type: "select", options: OPTIONS.university },
      { key: "my-height", label: "身高", type: "number", unit: "cm", min: 100, max: 250 },
      {
        key: "sexual-orientation",
        label: "性取向",
        type: "multiselect",
        options: ["異性戀", "同性戀", "雙性戀"],
      },
    ]
  },
  about: {
    title: "編輯 ✨ 讓人更了解你",
    fields: [
      { key: "my-bio", label: "自我介紹", type: "textarea", placeholder: "講少少關於你..." },
      {
        key: "my-activities",
        label: "想一齊做嘅活動",
        type: "multiselect",
        groups: ACTIVITY_GROUPS,
        supportOther: true,
        otherKey: "my-activities-others",
        otherLabel: "其他想法"
      },
      { key: "my-hobby", label: "興趣", type: "multiselect", groups: HOBBY_GROUPS },
    ]
  },
  // basic card removed — fields redistributed to summary and account
  personality: {
    title: "編輯 🧠 個性 & 相處",
    fields: [
      { key: "my-MBTI", label: "MBTI", type: "select", options: OPTIONS.mbti },
      { key: "my-love-language", label: "愛的語言", type: "rank", options: OPTIONS.loveLanguage },
    ]
  },
  lifestyle: {
    title: "編輯 🌿 生活習慣",
    fields: [
      { key: "my-drinking-habbit", label: "飲酒習慣", type: "select", options: OPTIONS.drinking },
      { key: "my-smoking-habbit", label: "吸煙習慣", type: "select", options: OPTIONS.smoking },
    ]
  },
  relationship: {
    title: "編輯 💛 關係觀",
    fields: [
      { key: "my-kids-expectation", label: "對小朋友的想法", type: "select", options: OPTIONS.kids },
      { key: "my-religion", label: "宗教", type: "select", options: OPTIONS.religion },
    ]
  },
  account: {
    title: "編輯 ⚙️ 帳戶設定",
    fields: [
      { key: "email", label: "電郵", readOnly: true },
      { key: "instagram", label: "Instagram" },
      { key: "phone", label: "電話" },
    ]
  },
};

// ---------------- Chip helper for inline display ----------------
function ProfileChip({ label, className = "" }) {
  if (!label) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 ${className}`}>
      {label}
    </span>
  );
}

// ---------------- Photo cell helper ----------------
function PhotoCell({ url, alt, className = "" }) {
  return (
    <div className={`bg-stone-100 rounded-lg overflow-hidden ${className}`}>
      {url ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">
          無相片
        </div>
      )}
    </div>
  );
}

// ---------------- Who I Am ----------------
function WhoIAm({ profile, onProfileUpdated }) {
  const [editingCard, setEditingCard] = useState(null);

  const photos = [
    profile["my-photo-1"],
    profile["my-photo-2"],
    profile["my-photo-3"]
  ];

  const { missing, percent } = calculateCompleteness(profile);

  const openSheet = (cardKey) => setEditingCard(cardKey);
  const closeSheet = () => setEditingCard(null);

  // Parse sexual-orientation for chip display (could be comma-separated string or single value)
  const orientationValues = profile["sexual-orientation"]
    ? String(profile["sexual-orientation"]).split(/[,，]/).map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="fade-in">
      {/* ---------- Card 1: Summary ---------- */}
      <Card onEdit={() => openSheet("summary")} editAlign="right">
        <div className="grid grid-cols-3 grid-rows-2 gap-2 mb-4" style={{ aspectRatio: "3/2" }}>
          <PhotoCell url={photos[0]} alt="photo-1" className="col-span-2 row-span-2" />
          <PhotoCell url={photos[1]} alt="photo-2" />
          <PhotoCell url={photos[2]} alt="photo-3" />
        </div>

        <div className="mb-4">
          {/* Name + sex chip + orientation chips — same row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-xl font-semibold text-stone-900">
              {profile.name || <span className="text-stone-300">未填寫</span>}
            </h2>
            {profile.sex && <ProfileChip label={profile.sex} />}
            {orientationValues.map((v, i) => (
              <ProfileChip key={i} label={v} />
            ))}
          </div>

          <div className="text-sm text-stone-600 space-y-0.5">
            {profile["my-age"] && <div>🎂 {profile["my-age"]}</div>}
            {profile["my-height"] && <div>📏 {profile["my-height"]} cm</div>}
            {profile["my-occupation"] && <div>💼 {profile["my-occupation"]}</div>}
            {profile["my-uni"] && <div>🎓 {profile["my-uni"]}</div>}
          </div>
        </div>

        <div className="bg-stone-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-700">個人檔案完成度</span>
            <span className="text-sm font-semibold text-stone-900">{percent}%</span>
          </div>
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          {missing > 0 ? (
            <p className="text-xs text-stone-500">
              再填 <span className="font-semibold text-stone-900">{missing}</span> 項提升配對機會
            </p>
          ) : (
            <p className="text-xs text-green-600">✨ 完美!你嘅檔案已經填齊曬</p>
          )}
        </div>
      </Card>

      {/* ---------- Card 2: About ---------- */}
      <Card
        icon="✨"
        title="讓人更了解你"
        helper="填得越多,我哋越容易幫你搵到適合的人"
        onEdit={() => openSheet("about")}
      >
        <Row label="自我介紹" value={profile["my-bio"]} />
        <Row label="想一齊做嘅活動" value={profile["my-activities"]} isChips />
        <Row label="興趣" value={profile["my-hobby"]} isChips />
      </Card>

      {/* ---------- Card 3: Personality ---------- */}
      <Card icon="🧠" title="個性 & 相處" onEdit={() => openSheet("personality")}>
        <Row label="MBTI" value={profile["my-MBTI"]} />
        <Row label="愛的語言" value={profile["my-love-language"]} />
      </Card>

      {/* ---------- Card 4: Lifestyle ---------- */}
      <Card icon="🌿" title="生活習慣" onEdit={() => openSheet("lifestyle")}>
        <Row label="飲酒習慣" value={profile["my-drinking-habbit"]} />
        <Row label="吸煙習慣" value={profile["my-smoking-habbit"]} />
      </Card>

      {/* ---------- Card 5: Relationship ---------- */}
      <Card icon="💛" title="關係觀" onEdit={() => openSheet("relationship")}>
        <Row label="對小朋友的想法" value={profile["my-kids-expectation"]} />
        <Row label="宗教" value={profile["my-religion"]} />
      </Card>

      {/* ---------- Card 6: Account ---------- */}
      <Card icon="⚙️" title="帳戶設定" onEdit={() => openSheet("account")}>
        <Row label="電郵" value={profile.email} />
        <Row label="Instagram" value={profile.instagram} />
        <Row label="電話" value={profile.phone} />
      </Card>

      {/* ---------- Bottom sheet ---------- */}
      {editingCard && (
        <BottomSheet
          open={true}
          title={PROFILE_CARD_CONFIGS[editingCard].title}
          fields={PROFILE_CARD_CONFIGS[editingCard].fields}
          profile={profile}
          onClose={closeSheet}
          onSaved={onProfileUpdated}
        />
      )}
    </div>
  );
}

// ---------------- What I Want ----------------
function WhatIWant({ profile, dealBreakers }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 fade-in">
      <WantField label="年齡範圍" fieldKey="age" dealBreakers={dealBreakers}>
        <RangeDisplay
          min={profile["their-age-min"]}
          max={profile["their-age-max"]}
          unit="歲"
        />
      </WantField>

      <WantField label="身高範圍" fieldKey="height" dealBreakers={dealBreakers}>
        <RangeDisplay
          min={profile["their-height-min"]}
          max={profile["their-height-max"]}
          unit="cm"
        />
      </WantField>

      <WantField label="職業" value={profile["their-occupation"]} fieldKey="occupation" dealBreakers={dealBreakers} />
      <WantField label="大學" value={profile["their-uni"]} fieldKey="uni" dealBreakers={dealBreakers} />
      <WantField label="MBTI" value={profile["their-MBTI"]} fieldKey="MBTI" dealBreakers={dealBreakers} />
      <WantField label="愛的語言" value={profile["their-love-language"]} fieldKey="love-language" dealBreakers={dealBreakers} />
      <WantField label="對小朋友的想法" value={profile["their-kids-preferences"]} fieldKey="kids-preferences" dealBreakers={dealBreakers} />
      <WantField label="飲酒習慣" value={profile["their-drinking-habbit"]} fieldKey="drinking-habbit" dealBreakers={dealBreakers} />
      <WantField label="吸煙習慣" value={profile["their-smoking-habbit"]} fieldKey="smoking-habbit" dealBreakers={dealBreakers} />
      <WantField label="宗教" value={profile["their-religion"]} fieldKey="religion" dealBreakers={dealBreakers} />
      <WantField label="其他要求" value={profile["extra-requirements"]} fieldKey="extra-requirements" dealBreakers={dealBreakers} hideToggle />
    </div>
  );
}
