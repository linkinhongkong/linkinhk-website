// ============================================================
// tab-match.js — the Match tab (default landing tab)
// ============================================================

// ---------------- Helpers ----------------

function ageFromDOB(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const mo = now.getMonth() - d.getMonth();
  if (mo < 0 || (mo === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

function zodiacFromDOB(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const signs = [
    { name: "山羊座", emoji: "♑", from: [12, 22], to: [1, 19] },
    { name: "水瓶座", emoji: "♒", from: [1, 20], to: [2, 18] },
    { name: "雙魚座", emoji: "♓", from: [2, 19], to: [3, 20] },
    { name: "白羊座", emoji: "♈", from: [3, 21], to: [4, 19] },
    { name: "金牛座", emoji: "♉", from: [4, 20], to: [5, 20] },
    { name: "雙子座", emoji: "♊", from: [5, 21], to: [6, 20] },
    { name: "巨蟹座", emoji: "♋", from: [6, 21], to: [7, 22] },
    { name: "獅子座", emoji: "♌", from: [7, 23], to: [8, 22] },
    { name: "處女座", emoji: "♍", from: [8, 23], to: [9, 22] },
    { name: "天秤座", emoji: "♎", from: [9, 23], to: [10, 22] },
    { name: "天蠍座", emoji: "♏", from: [10, 23], to: [11, 21] },
    { name: "射手座", emoji: "♐", from: [11, 22], to: [12, 21] },
  ];
  for (const s of signs) {
    const [fm, fd] = s.from;
    const [tm, td] = s.to;
    if (fm === tm) {
      if (m === fm && day >= fd && day <= td) return s;
    } else {
      if ((m === fm && day >= fd) || (m === tm && day <= td)) return s;
    }
  }
  return null;
}

// ---------------- Photo Carousel ----------------
// Photo-1 default with 5% peek of photo-2 right and photo-3 left.
// Always shows dots + arrows; arrows hide at edges.
function PhotoCarousel({ photos }) {
  const [index, setIndex] = useState(0);
  const validPhotos = photos.filter(p => p && String(p).trim() !== "");
  const count = validPhotos.length;

  if (count === 0) return null;

  const showLeft = index > 0;
  const showRight = index < count - 1;

  const go = (newIdx) => {
    if (newIdx < 0 || newIdx >= count) return;
    setIndex(newIdx);
  };

  return (
    <div className="relative w-full mb-4 fade-in" style={{ aspectRatio: "1 / 1" }}>
      <div className="relative w-full h-full overflow-hidden rounded-2xl bg-stone-100">
        <div
          className="absolute inset-0 flex transition-transform duration-300 ease-out"
          style={{
            // Each slide is 90% wide; offset shifts by 90% per index, with 5% initial padding
            transform: `translateX(calc(${-index * 90}% + 5%))`,
          }}
        >
          {validPhotos.map((url, i) => (
            <div key={i} className="flex-shrink-0 px-1" style={{ width: "90%" }}>
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover rounded-2xl"
                style={{ aspectRatio: "1 / 1" }}
                onError={(e) => { e.target.style.opacity = "0.3"; }}
              />
            </div>
          ))}
        </div>
      </div>

      {showLeft && (
        <button
          onClick={() => go(index - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-stone-700 hover:bg-white transition z-10"
          aria-label="上一張"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {showRight && (
        <button
          onClick={() => go(index + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center text-stone-700 hover:bg-white transition z-10"
          aria-label="下一張"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {validPhotos.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
              }`}
              aria-label={`跳到第 ${i + 1} 張`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Info chips ----------------
function InfoChip({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-stone-100 text-stone-800 text-sm">
      {children}
    </span>
  );
}

function InfoChipsRow({ partner }) {
  const age = ageFromDOB(partner["my-age"]);
  const zodiac = zodiacFromDOB(partner["my-age"]);
  const chips = [];

  if (age != null) chips.push(<InfoChip key="age">🎂 {age}歲</InfoChip>);
  if (partner["my-height"]) chips.push(<InfoChip key="h">📏 {partner["my-height"]}cm</InfoChip>);
  if (partner["my-occupation"]) chips.push(<InfoChip key="occ">{partner["my-occupation"]}</InfoChip>);
  if (partner["my-uni"]) chips.push(<InfoChip key="uni">🎓 {partner["my-uni"]}</InfoChip>);
  if (zodiac) chips.push(<InfoChip key="z">{zodiac.emoji} {zodiac.name}</InfoChip>);
  if (partner["my-MBTI"]) chips.push(<InfoChip key="mbti">{partner["my-MBTI"]}</InfoChip>);
  if (partner["my-religion"]) chips.push(<InfoChip key="r">⛪ {partner["my-religion"]}</InfoChip>);

  if (chips.length === 0) return null;

  return <div className="flex flex-wrap gap-2 mb-4">{chips}</div>;
}

// ---------------- Compatibility banner ----------------
function CompatibilityBanner({ score }) {
  return (
    <div
      className="rounded-2xl p-4 mb-4 text-white text-center fade-in"
      style={{ background: "linear-gradient(to right, #FF6EB4, #A259FF)" }}
    >
      <div className="text-xs opacity-90 mb-1">你哋互相選擇對方為理想型 ✨</div>
      <div className="text-2xl font-bold">匹配度 {score}%</div>
    </div>
  );
}

// ---------------- Bio card ----------------
function BioCard({ bio }) {
  if (!bio || String(bio).trim() === "") return null;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-4 fade-in">
      <div className="text-xs text-stone-500 mb-2">關於佢</div>
      <p className="text-stone-800 whitespace-pre-wrap leading-relaxed text-sm">
        {bio}
      </p>
    </div>
  );
}

// ---------------- Toast ----------------
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-5 py-3 rounded-full text-sm shadow-lg z-50 fade-in">
      {message}
    </div>
  );
}

// ---------------- Action buttons ----------------
function ActionButtons({ onAccept, onReject }) {
  return (
    <div className="flex gap-3 mb-6 fade-in">
      <button
        onClick={onReject}
        className="flex-1 py-3.5 rounded-full bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 transition"
      >
        無興趣
      </button>
      <button
        onClick={onAccept}
        className="flex-1 py-3.5 rounded-full text-white font-medium transition"
        style={{ background: "linear-gradient(to right, #FF6EB4, #A259FF)" }}
      >
        想認識 💚
      </button>
    </div>
  );
}

// ---------------- Empty state ----------------
function NoMatchState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 fade-in">
      <div className="text-5xl mb-4">💌</div>
      <p className="text-stone-700 font-medium mb-1">今個禮拜暫時未有配對</p>
      <p className="text-stone-500 text-sm text-center max-w-xs">
        我哋每星期二夜晚送出新嘅配對結果,記得返嚟睇睇 ✨
      </p>
    </div>
  );
}

// ---------------- Main Match tab ----------------
function MatchTab({ profile, currentMatch }) {
  const [toast, setToast] = useState(null);

  if (!currentMatch || !currentMatch.partnerProfile) {
    return <NoMatchState />;
  }

  const partner = currentMatch.partnerProfile;
  const photos = [
    partner["my-photo-1"],
    partner["my-photo-2"],
    partner["my-photo-3"],
  ];

  return (
    <div className="fade-in pb-4">
      <CompatibilityBanner score={currentMatch.compatibilityScore} />
      <PhotoCarousel photos={photos} />

      {partner.name && (
        <h2 className="text-xl font-semibold text-stone-900 mb-3">
          {partner.name}
        </h2>
      )}

      <InfoChipsRow partner={partner} />
      <BioCard bio={partner["my-bio"]} />

      <ActionButtons
        onAccept={() => setToast("建設緊 💚")}
        onReject={() => setToast("建設緊")}
      />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
