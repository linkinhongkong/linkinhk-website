// ============================================================
// tab-history.js — match history
// Horizontal card list (newest first) + click-to-expand full view
// ============================================================

function HistoryTab({ profile, history }) {
  const [selected, setSelected] = React.useState(null);

  if (selected) {
    return (
      <HistoryDetail
        match={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="fade-in flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">🕐</div>
        <h2 className="text-xl font-semibold text-stone-700 mb-2">仲未有配對紀錄</h2>
        <p className="text-sm text-stone-500">等下次配對結果出咗先見到你嘅紀錄 ✨</p>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-3">
      {history.map((m) => (
        <HistoryCard key={m.id} match={m} onClick={() => setSelected(m)} />
      ))}
    </div>
  );
}

// ---------------- Card (list view) ----------------
function HistoryCard({ match, onClick }) {
  const p = match.partnerProfile || {};
  const photo = p["my-photo-1"] || "";
  const matched = String(match.status || "").toLowerCase() === "matched";

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-stone-200 overflow-hidden flex items-stretch text-left hover:border-stone-300 transition"
    >
      {/* Left: square photo, 1/4 width */}
      <div className="w-1/4 aspect-square bg-stone-100 flex-shrink-0 relative overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={p.name || ""}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-3xl">👤</div>
        )}
      </div>

      {/* Right: chips + status + time, 3/4 width */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          {/* Name */}
          {p.name && (
            <div className="text-base font-semibold text-stone-900 mb-1 truncate">
              {p.name}
            </div>
          )}
          {/* Info chips */}
          <div className="flex flex-wrap gap-1.5">
            {buildChips(p).map((c, i) => (
              <InfoChip key={i} text={c} />
            ))}
            <StatusChip matched={matched} />
          </div>
        </div>
        {/* Match time */}
        <div className="text-[11px] text-stone-400 mt-2">
          {formatMatchTime(match.createdAt)}
        </div>
      </div>
    </button>
  );
}

// ---------------- Detail (full page view) ----------------
function HistoryDetail({ match, onBack }) {
  const p = match.partnerProfile || {};
  const photos = ["my-photo-1", "my-photo-2", "my-photo-3"]
    .map((k) => p[k])
    .filter(Boolean);

  const [photoIdx, setPhotoIdx] = React.useState(0);
  const matched = String(match.status || "").toLowerCase() === "matched";

  return (
    <div className="fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 mb-3"
      >
        <span>←</span><span>返回</span>
      </button>

      {/* Photo carousel (matches Match tab style) */}
      {photos.length > 0 && (
        <HistoryCarousel
          photos={photos}
          idx={photoIdx}
          setIdx={setPhotoIdx}
        />
      )}

      {/* Name + status + time */}
      <div className="mt-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-semibold text-stone-900">{p.name || ""}</h2>
          <StatusChip matched={matched} />
        </div>
        <div className="text-xs text-stone-400 mt-1">
          {formatMatchTime(match.createdAt)}
        </div>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {buildChips(p).map((c, i) => (
          <InfoChip key={i} text={c} />
        ))}
      </div>

      {/* Bio card */}
      {p["my-bio"] && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-3">
          <div className="text-xs font-medium text-stone-400 mb-2">關於佢</div>
          <div className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">
            {p["my-bio"]}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Carousel (simplified, matches Match tab pattern) ----------------
function HistoryCarousel({ photos, idx, setIdx }) {
  const prev = () => setIdx(Math.max(0, idx - 1));
  const next = () => setIdx(Math.min(photos.length - 1, idx + 1));
  const canPrev = idx > 0;
  const canNext = idx < photos.length - 1;

  return (
    <div className="relative bg-stone-100 rounded-2xl overflow-hidden" style={{ padding: "20px" }}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
        <div
          className="flex h-full transition-transform duration-300"
          style={{ transform: `translateX(-${idx * 90}%)`, width: `${photos.length * 90}%` }}
        >
          {photos.map((src, i) => (
            <div
              key={i}
              className="h-full flex-shrink-0 px-1"
              style={{ width: `${100 / photos.length}%` }}
            >
              <img src={src} alt="" className="w-full h-full object-cover rounded-xl" />
            </div>
          ))}
        </div>

        {canPrev && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-stone-700"
          >
            ‹
          </button>
        )}
        {canNext && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-stone-700"
          >
            ›
          </button>
        )}
      </div>

      {/* Dots */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {photos.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-stone-700" : "w-1.5 bg-stone-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Helpers ----------------
function InfoChip({ text }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs">
      {text}
    </span>
  );
}

function StatusChip({ matched }) {
  const cls = matched
    ? "bg-gradient-to-r from-[#FF6EB4] to-[#A259FF] text-white"
    : "bg-stone-200 text-stone-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {matched ? "配對成功" : "配對失敗"}
    </span>
  );
}

// Build chips array. Blank fields are skipped.
function buildChips(p) {
  const chips = [];
  const age = computeAgeFromDOB(p["my-age"]);
  if (age) chips.push(`🎂 ${age}歲`);
  if (p["my-height"]) chips.push(`📏 ${p["my-height"]}cm`);
  if (p["my-occupation"]) chips.push(p["my-occupation"]);
  if (p["my-uni"]) chips.push(`🎓 ${p["my-uni"]}`);
  const zodiac = computeZodiacFromDOB(p["my-age"]);
  if (zodiac) chips.push(zodiac);
  if (p["my-MBTI"]) chips.push(p["my-MBTI"]);
  if (p["my-religion"]) chips.push(p["my-religion"]);
  return chips;
}

function computeAgeFromDOB(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age > 0 && age < 120 ? age : null;
}

function computeZodiacFromDOB(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const signs = [
    [1, 20, "♑ 摩羯座"], [2, 19, "♒ 水瓶座"], [3, 21, "♓ 雙魚座"],
    [4, 20, "♈ 白羊座"], [5, 21, "♉ 金牛座"], [6, 22, "♊ 雙子座"],
    [7, 23, "♋ 巨蟹座"], [8, 23, "♌ 獅子座"], [9, 23, "♍ 處女座"],
    [10, 24, "♎ 天秤座"], [11, 23, "♏ 天蠍座"], [12, 22, "♐ 射手座"],
    [12, 31, "♑ 摩羯座"],
  ];
  for (const [m, dmax, name] of signs) {
    if (month < m || (month === m && day <= dmax)) return name;
  }
  return null;
}

// Format "2026-04-07T12:34:00.000Z" or "7/4/2026 12:34pm" → "2026年4月7日"
function formatMatchTime(raw) {
  if (!raw) return "";
  let d = new Date(raw);
  if (isNaN(d)) {
    // fallback for DD/MM/YYYY hh:mmam/pm
    const m = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  }
  if (isNaN(d)) return String(raw);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 配對`;
}
