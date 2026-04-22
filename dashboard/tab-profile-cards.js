// ============================================================
// tab-profile-cards.js — WhoIAm profile cards + edit sheets
// ============================================================

const UPDATE_BIO_URL = "https://linkinhk.app.n8n.cloud/webhook/update-bio";
const UPDATE_PHOTO_URL = "https://linkinhk.app.n8n.cloud/webhook/update-photo";

function authPostCustom(url, body, isFormData) {
  const token = getToken() || "";
  const headers = { "Authorization": "Bearer " + token };
  if (!isFormData) headers["Content-Type"] = "application/json";
  return fetch(url, {
    method: "POST",
    headers,
    body: isFormData ? body : JSON.stringify(body),
  }).then((res) => res.json());
}

// ---------------- Card edit configs (for standard BottomSheet) ----------------
const PROFILE_CARD_CONFIGS = {
  summary: {
    title: "編輯個人簡介",
    fields: [
      { key: "name", label: "姓名" },
      { key: "sex", label: "性別", readOnly: true },
      { key: "my-age", label: "出生日期", readOnly: true },
      { key: "my-occupation", label: "職業", type: "select", options: OPTIONS.occupation },
      { key: "my-uni", label: "大學", type: "select", options: OPTIONS.university },
      { key: "my-height", label: "身高", type: "number", unit: "cm", min: 100, max: 250 },
      {
        key: "sexual-orientation",
        label: "性取向",
        type: "multiselect",
        groups: { " ": [{ label: "異性戀" }, { label: "同性戀" }, { label: "雙性戀" }] },
      },
    ]
  },
  about: {
    title: "編輯 ✨ 讓人更了解你",
    fields: [
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

// ---------------- Small helpers ----------------
function ProfileChip({ label }) {
  if (!label) return null;
  return <span className="dash-chip-readonly">{label}</span>;
}

function PhotoCell({ url, alt, className }) {
  return (
    <div className={"photo-cell " + (className || "")}>
      {url ? (
        <img src={url} alt={alt} />
      ) : (
        <div className="photo-cell-empty">無相片</div>
      )}
    </div>
  );
}

// ---------------- Bio edit sheet ----------------
function BioEditSheet({ open, currentBio, onClose, onSaved }) {
  const [text, setText] = useState(currentBio || "");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = () => {
    setSaving(true);
    authPostCustom(UPDATE_BIO_URL, { bio: text })
      .then((result) => {
        setSaving(false);
        if (result && result.success && result.profile && onSaved) onSaved(result.profile);
        onClose();
      })
      .catch((e) => { console.error("Bio save error:", e); setSaving(false); onClose(); });
  };

  return (
    <div className="sheet-overlay">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel">
        <div className="sheet-header">
          <h3 className="sheet-title">編輯自我介紹</h3>
          <button onClick={onClose} className="icon-btn" aria-label="關閉">
            <CloseIcon className="icon-md" />
          </button>
        </div>
        <div className="sheet-body">
          <textarea
            className="text-input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="講少少關於你..."
            style={{ resize: "none" }}
          />
        </div>
        <div className="sheet-footer">
          <button
            onClick={handleSave}
            disabled={saving}
            className="nav-btn primary"
            style={{ width: "100%" }}
          >
            {saving ? "儲存中⋯" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Photo edit sheet ----------------
function PhotoEditSheet({ open, photos, onClose, onSaved }) {
  const [previews, setPreviews] = useState([null, null, null]);
  const [files, setFiles] = useState([null, null, null]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleFile = (idx, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const newFiles = [files[0], files[1], files[2]];
    newFiles[idx] = file;
    setFiles(newFiles);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newPreviews = [previews[0], previews[1], previews[2]];
      newPreviews[idx] = ev.target.result;
      setPreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaving(true);
    const uploads = [];
    for (let i = 0; i < 3; i++) {
      if (files[i]) uploads.push({ idx: i, file: files[i] });
    }
    if (uploads.length === 0) { onClose(); return; }

    const uploadNext = (pos) => {
      if (pos >= uploads.length) {
        setSaving(false);
        if (onSaved) onSaved();
        onClose();
        return;
      }
      const item = uploads[pos];
      const formData = new FormData();
      formData.append("photoIndex", String(item.idx + 1));
      formData.append("photo", item.file);
      authPostCustom(UPDATE_PHOTO_URL, formData, true)
        .then(() => uploadNext(pos + 1))
        .catch((e) => { console.error("Photo upload error:", e); uploadNext(pos + 1); });
    };
    uploadNext(0);
  };

  const hasChanges = files[0] || files[1] || files[2];

  return (
    <div className="sheet-overlay">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel">
        <div className="sheet-header">
          <h3 className="sheet-title">編輯相片</h3>
          <button onClick={onClose} className="icon-btn" aria-label="關閉">
            <CloseIcon className="icon-md" />
          </button>
        </div>
        <div className="sheet-body">
          <div className="photo-grid" style={{ marginBottom: 16 }}>
            {[0, 1, 2].map((idx) => {
              const src = previews[idx] || photos[idx];
              return (
                <label key={idx} className={"photo-slot" + (src ? " filled" : "")}>
                  {src ? (
                    <img src={src} alt={`photo-${idx + 1}`} />
                  ) : (
                    <>
                      <span className="slot-icon">+</span>
                      <span className="slot-label">上傳</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="upload-input"
                    onChange={(e) => handleFile(idx, e)}
                  />
                </label>
              );
            })}
          </div>
        </div>
        <div className="sheet-footer">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="nav-btn primary"
            style={{ width: "100%" }}
          >
            {saving ? "上傳中⋯" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Who I Am ----------------
function WhoIAm({ profile, onProfileUpdated }) {
  const [editingCard, setEditingCard] = useState(null);
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [editingBio, setEditingBio] = useState(false);

  const photos = [
    profile["my-photo-1"],
    profile["my-photo-2"],
    profile["my-photo-3"]
  ];

  const completeness = calculateCompleteness(profile);
  const { missing, percent } = completeness;

  const openSheet = (cardKey) => setEditingCard(cardKey);
  const closeSheet = () => setEditingCard(null);

  const orientationRaw = profile["sexual-orientation"] || "";
  const orientationValues = orientationRaw
    ? String(orientationRaw).split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const handleProfileUpdated = (newProfile) => {
    if (newProfile && typeof newProfile === "object" && newProfile.email && onProfileUpdated) {
      onProfileUpdated(newProfile);
    }
  };

  return (
    <div className="fade-in">

      {/* Completeness */}
      <div className="completeness-card">
        <div className="completeness-head">
          <span className="completeness-label">個人檔案完成度</span>
          <span className="completeness-percent">{percent}%</span>
        </div>
        <div className="completeness-bar">
          <div className="completeness-fill" style={{ width: percent + "%" }} />
        </div>
        {missing > 0 ? (
          <p className="completeness-hint">
            再填 <span style={{ fontWeight: 600, color: "var(--text)" }}>{missing}</span> 項提升配對機會
          </p>
        ) : (
          <p className="completeness-hint done">✨ 完美!你嘅檔案已經填齊曬</p>
        )}
      </div>

      {/* Photos */}
      <Card icon="📷" title="相片" onEdit={() => setEditingPhotos(true)}>
        <div className="photo-grid-2x3">
          <PhotoCell url={photos[0]} alt="photo-1" className="span-2x2" />
          <PhotoCell url={photos[1]} alt="photo-2" />
          <PhotoCell url={photos[2]} alt="photo-3" />
        </div>
      </Card>

      {/* Summary */}
      <div className="dash-card">
        <button
          onClick={() => openSheet("summary")}
          className="icon-btn card-edit-top"
          aria-label="編輯"
        >
          <PencilIcon className="icon-sm" />
        </button>

        <div className="flex items-center flex-wrap gap-sm" style={{ marginBottom: 4 }}>
          <h2 className="summary-name">
            {profile.name || <span style={{ color: "#ccc" }}>未填寫</span>}
          </h2>
          {profile.sex && <ProfileChip label={profile.sex} />}
          {orientationValues.map((v, i) => <ProfileChip key={i} label={v} />)}
        </div>

        <div className="summary-details">
          {profile["my-age"] && <div>🎂 {profile["my-age"]}</div>}
          {profile["my-height"] && <div>📏 {profile["my-height"]} cm</div>}
          {profile["my-occupation"] && <div>💼 {profile["my-occupation"]}</div>}
          {profile["my-uni"] && <div>🎓 {profile["my-uni"]}</div>}
        </div>
      </div>

      {/* Bio */}
      <Card icon="💬" title="自我介紹" onEdit={() => setEditingBio(true)}>
        <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {profile["my-bio"] || <span style={{ color: "#ccc" }}>未填寫</span>}
        </div>
      </Card>

      {/* About */}
      <Card
        icon="✨"
        title="讓人更了解你"
        helper="填得越多,我哋越容易幫你搵到適合的人"
        onEdit={() => openSheet("about")}
      >
        <Row label="想一齊做嘅活動" value={profile["my-activities"]} isChips />
        <Row label="興趣" value={profile["my-hobby"]} isChips />
      </Card>

      {/* Personality */}
      <Card icon="🧠" title="個性 & 相處" onEdit={() => openSheet("personality")}>
        <Row label="MBTI" value={profile["my-MBTI"]} />
        <Row label="愛的語言" value={profile["my-love-language"]} />
      </Card>

      {/* Lifestyle */}
      <Card icon="🌿" title="生活習慣" onEdit={() => openSheet("lifestyle")}>
        <Row label="飲酒習慣" value={profile["my-drinking-habbit"]} />
        <Row label="吸煙習慣" value={profile["my-smoking-habbit"]} />
      </Card>

      {/* Relationship */}
      <Card icon="💛" title="關係觀" onEdit={() => openSheet("relationship")}>
        <Row label="對小朋友的想法" value={profile["my-kids-expectation"]} />
        <Row label="宗教" value={profile["my-religion"]} />
      </Card>

      {/* Account */}
      <Card icon="⚙️" title="帳戶設定" onEdit={() => openSheet("account")}>
        <Row label="電郵" value={profile.email} />
        <Row label="Instagram" value={profile.instagram} />
        <Row label="電話" value={profile.phone} />
      </Card>

      {/* Standard BottomSheet */}
      {editingCard && (
        <BottomSheet
          open={true}
          title={PROFILE_CARD_CONFIGS[editingCard].title}
          fields={PROFILE_CARD_CONFIGS[editingCard].fields}
          profile={profile}
          onClose={closeSheet}
          onSaved={handleProfileUpdated}
        />
      )}

      {editingBio && (
        <BioEditSheet
          open={true}
          currentBio={profile["my-bio"]}
          onClose={() => setEditingBio(false)}
          onSaved={(newProfile) => { setEditingBio(false); handleProfileUpdated(newProfile); }}
        />
      )}

      {editingPhotos && (
        <PhotoEditSheet
          open={true}
          photos={photos}
          onClose={() => setEditingPhotos(false)}
          onSaved={() => { setEditingPhotos(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}
