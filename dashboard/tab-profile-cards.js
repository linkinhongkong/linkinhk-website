// ============================================================
// tab-profile-cards.js — WhoIAm and WhatIWant card layouts
// ============================================================

// --- Custom webhook URLs for photo & bio updates ---
var UPDATE_BIO_URL = "https://linkinhk.app.n8n.cloud/webhook/update-bio";
var UPDATE_PHOTO_URL = "https://linkinhk.app.n8n.cloud/webhook/update-photo";

// --- Helper: authenticated POST ---
function authPostCustom(url, body, isFormData) {
  var token = localStorage.getItem("token") || "";
  var headers = { "Authorization": "Bearer " + token };
  if (!isFormData) { headers["Content-Type"] = "application/json"; }
  return fetch(url, {
    method: "POST",
    headers: headers,
    body: isFormData ? body : JSON.stringify(body),
  }).then(function(res) { return res.json(); });
}

// ---------------- Card edit configs (for standard BottomSheet) ----------------
const PROFILE_CARD_CONFIGS = {
  summary: {
    title: "編輯個人簡介",
    fields: [
      { key: "name", label: "姓名" },
      // my-age is read-only — not editable
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
  // bio removed from about — now in standalone card via update-bio webhook
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

// ================== Small helpers ==================

function ProfileChip({ label }) {
  if (!label) return null;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
      {label}
    </span>
  );
}

function PhotoCell({ url, alt, className }) {
  return (
    <div className={"bg-stone-100 rounded-lg overflow-hidden " + (className || "")}>
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

function CardEditBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-sm border border-stone-200"
      style={{ zIndex: 5, lineHeight: 1 }}
    >
      <span className="text-stone-500 text-sm">✏️</span>
    </button>
  );
}

// ================== Bio Edit Sheet ==================

function BioEditSheet({ open, currentBio, onClose, onSaved }) {
  const [text, setText] = useState(currentBio || "");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function handleSave() {
    setSaving(true);
    authPostCustom(UPDATE_BIO_URL, { bio: text })
      .then(function(result) {
        setSaving(false);
        if (result && result.success && onSaved) {
          onSaved(result);
        }
        onClose();
      })
      .catch(function(e) {
        console.error("Bio save error:", e);
        setSaving(false);
        onClose();
      });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8"
        onClick={function(e) { e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900">編輯自我介紹</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">&times;</button>
        </div>
        <textarea
          className="w-full border border-stone-200 rounded-lg p-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          rows={6}
          value={text}
          onChange={function(e) { setText(e.target.value); }}
          placeholder="講少少關於你..."
          style={{ resize: "none" }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
          style={{ background: "linear-gradient(to right, #FF6EB4, #A259FF)" }}
        >
          {saving ? "儲存中⋯" : "儲存"}
        </button>
      </div>
    </div>
  );
}

// ================== Photo Edit Sheet ==================

function PhotoEditSheet({ open, photos, onClose, onSaved }) {
  const [previews, setPreviews] = useState([null, null, null]);
  const [files, setFiles] = useState([null, null, null]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function handleFile(idx, e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var newFiles = [files[0], files[1], files[2]];
    newFiles[idx] = file;
    setFiles(newFiles);
    var reader = new FileReader();
    reader.onload = function(ev) {
      var newPreviews = [previews[0], previews[1], previews[2]];
      newPreviews[idx] = ev.target.result;
      setPreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setSaving(true);
    var uploads = [];
    for (var i = 0; i < 3; i++) {
      if (files[i]) {
        uploads.push({ idx: i, file: files[i] });
      }
    }
    if (uploads.length === 0) { onClose(); return; }

    function uploadNext(pos) {
      if (pos >= uploads.length) {
        setSaving(false);
        if (onSaved) onSaved();
        onClose();
        return;
      }
      var item = uploads[pos];
      var formData = new FormData();
      formData.append("photoIndex", String(item.idx + 1));
      formData.append("photo", item.file);
      authPostCustom(UPDATE_PHOTO_URL, formData, true)
        .then(function() { uploadNext(pos + 1); })
        .catch(function(e) {
          console.error("Photo upload error:", e);
          uploadNext(pos + 1);
        });
    }
    uploadNext(0);
  }

  var hasChanges = files[0] || files[1] || files[2];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8"
        onClick={function(e) { e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900">編輯相片</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">&times;</button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2].map(function(idx) {
            var src = previews[idx] || photos[idx];
            return (
              <label key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 cursor-pointer block">
                {src ? (
                  <img src={src} alt={"photo-" + (idx + 1)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 text-xs">
                    <span className="text-2xl mb-1">+</span>
                    <span>上傳</span>
                  </div>
                )}
                {src && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium bg-black/40 px-2 py-1 rounded">更換</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={function(e) { handleFile(idx, e); }}
                />
              </label>
            );
          })}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-40"
          style={{ background: "linear-gradient(to right, #FF6EB4, #A259FF)" }}
        >
          {saving ? "上傳中⋯" : "儲存"}
        </button>
      </div>
    </div>
  );
}

// ================== Who I Am ==================

function WhoIAm({ profile, onProfileUpdated }) {
  const [editingCard, setEditingCard] = useState(null);
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [editingBio, setEditingBio] = useState(false);

  var photos = [
    profile["my-photo-1"],
    profile["my-photo-2"],
    profile["my-photo-3"]
  ];

  var completeness = calculateCompleteness(profile);
  var missing = completeness.missing;
  var percent = completeness.percent;

  function openSheet(cardKey) { setEditingCard(cardKey); }
  function closeSheet() { setEditingCard(null); }

  // Parse sexual-orientation for chip display
  var orientationRaw = profile["sexual-orientation"] || "";
  var orientationValues = [];
  if (orientationRaw) {
    orientationValues = String(orientationRaw).split(/[,，]/).map(function(s) { return s.trim(); }).filter(Boolean);
  }

  return (
    <div className="fade-in">

      {/* ---------- Card 1: Photos ---------- */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4 relative">
        <CardEditBtn onClick={function() { setEditingPhotos(true); }} />
        <div className="grid grid-cols-3 grid-rows-2 gap-2" style={{ aspectRatio: "3/2" }}>
          <PhotoCell url={photos[0]} alt="photo-1" className="col-span-2 row-span-2" />
          <PhotoCell url={photos[1]} alt="photo-2" />
          <PhotoCell url={photos[2]} alt="photo-3" />
        </div>
      </div>

      {/* ---------- Card 2: Summary ---------- */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4 relative">
        <CardEditBtn onClick={function() { openSheet("summary"); }} />

        {/* Name + sex chip + orientation chips — same row */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-xl font-semibold text-stone-900">
            {profile.name || <span className="text-stone-300">未填寫</span>}
          </h2>
          {profile.sex && <ProfileChip label={profile.sex} />}
          {orientationValues.map(function(v, i) {
            return <ProfileChip key={i} label={v} />;
          })}
        </div>

        <div className="text-sm text-stone-600 space-y-0.5 mb-4">
          {profile["my-age"] && <div>🎂 {profile["my-age"]}</div>}
          {profile["my-height"] && <div>📏 {profile["my-height"]} cm</div>}
          {profile["my-occupation"] && <div>💼 {profile["my-occupation"]}</div>}
          {profile["my-uni"] && <div>🎓 {profile["my-uni"]}</div>}
        </div>

        {/* Completeness bar */}
        <div className="bg-stone-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-stone-700">個人檔案完成度</span>
            <span className="text-sm font-semibold text-stone-900">{percent}%</span>
          </div>
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all"
              style={{ width: percent + "%" }}
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
      </div>

      {/* ---------- Card 3: Bio (自我介紹) ---------- */}
      <Card icon="💬" title="自我介紹" onEdit={function() { setEditingBio(true); }}>
        <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
          {profile["my-bio"] || <span className="text-stone-300">未填寫</span>}
        </div>
      </Card>

      {/* ---------- Card 4: About ---------- */}
      <Card
        icon="✨"
        title="讓人更了解你"
        helper="填得越多,我哋越容易幫你搵到適合的人"
        onEdit={function() { openSheet("about"); }}
      >
        <Row label="想一齊做嘅活動" value={profile["my-activities"]} isChips />
        <Row label="興趣" value={profile["my-hobby"]} isChips />
      </Card>

      {/* ---------- Card 5: Personality ---------- */}
      <Card icon="🧠" title="個性 & 相處" onEdit={function() { openSheet("personality"); }}>
        <Row label="MBTI" value={profile["my-MBTI"]} />
        <Row label="愛的語言" value={profile["my-love-language"]} />
      </Card>

      {/* ---------- Card 6: Lifestyle ---------- */}
      <Card icon="🌿" title="生活習慣" onEdit={function() { openSheet("lifestyle"); }}>
        <Row label="飲酒習慣" value={profile["my-drinking-habbit"]} />
        <Row label="吸煙習慣" value={profile["my-smoking-habbit"]} />
      </Card>

      {/* ---------- Card 7: Relationship ---------- */}
      <Card icon="💛" title="關係觀" onEdit={function() { openSheet("relationship"); }}>
        <Row label="對小朋友的想法" value={profile["my-kids-expectation"]} />
        <Row label="宗教" value={profile["my-religion"]} />
      </Card>

      {/* ---------- Card 8: Account ---------- */}
      <Card icon="⚙️" title="帳戶設定" onEdit={function() { openSheet("account"); }}>
        <Row label="電郵" value={profile.email} />
        <Row label="Instagram" value={profile.instagram} />
        <Row label="電話" value={profile.phone} />
      </Card>

      {/* ---------- Standard BottomSheet for normal card edits ---------- */}
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

      {/* ---------- Custom Bio sheet ---------- */}
      {editingBio && (
        <BioEditSheet
          open={true}
          currentBio={profile["my-bio"]}
          onClose={function() { setEditingBio(false); }}
          onSaved={function(result) {
            setEditingBio(false);
            if (onProfileUpdated) onProfileUpdated(result);
          }}
        />
      )}

      {/* ---------- Custom Photo sheet ---------- */}
      {editingPhotos && (
        <PhotoEditSheet
          open={true}
          photos={photos}
          onClose={function() { setEditingPhotos(false); }}
          onSaved={function() {
            setEditingPhotos(false);
            if (onProfileUpdated) onProfileUpdated();
          }}
        />
      )}
    </div>
  );
}

// ================== What I Want (unchanged) ==================

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
