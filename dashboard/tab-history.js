// ============================================================
// tab-history.js — match history (list + detail view)
// ============================================================

function HistoryTab({ profile, history }) {
  const [selected, setSelected] = useState(null);

  const seen = new Set();
  const uniqueHistory = (history || []).filter((m) => {
    const partnerEmail = (m.partnerProfile && m.partnerProfile.email) || "";
    const key = `${partnerEmail}|${m.createdAt || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (selected) {
    return <HistoryDetail match={selected} onBack={() => setSelected(null)} />;
  }

  if (uniqueHistory.length === 0) {
    return (
      <div className="fade-in flex flex-col items-center justify-center" style={{ padding: "80px 0" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🕐</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>仲未有配對紀錄</h2>
        <p style={{ fontSize: 14, color: "var(--text-light)" }}>等下次配對結果出咗先見到你嘅紀錄 ✨</p>
      </div>
    );
  }

  return (
    <div className="fade-in flex flex-col gap-md">
      {uniqueHistory.map((m, i) => (
        <HistoryCard
          key={`${(m.partnerProfile && m.partnerProfile.email) || "?"}-${m.createdAt || i}`}
          match={m}
          onClick={() => setSelected(m)}
        />
      ))}
    </div>
  );
}

// ---------------- Card (list view) ----------------
function HistoryCard({ match, onClick }) {
  const p = match.partnerProfile || {};
  const photo = p["my-photo-1"] || "";
  const status = getMatchStatus(match);

  return (
    <button onClick={onClick} className="history-card">
      <div className="history-card-photo">
        {photo ? (
          <img src={photo} alt={p.name || ""} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <div className="history-card-photo-empty">👤</div>
        )}
      </div>
      <div className="history-card-body">
        <div>
          <div className="history-card-header">
            {p.name && <div className="history-card-name">{p.name}</div>}
            <StatusChip status={status} />
          </div>
          <div className="flex flex-wrap gap-sm">
            {buildChips(p).map((c, i) => (
              <HistoryInfoChip key={i} text={c} />
            ))}
          </div>
        </div>
        <div className="history-card-time">{formatMatchTime(match.createdAt)}</div>
      </div>
    </button>
  );
}

// ---------------- Detail view ----------------
function HistoryDetail({ match, onBack }) {
  const p = match.partnerProfile || {};
  const photos = ["my-photo-1", "my-photo-2", "my-photo-3"]
    .map((k) => p[k])
    .filter(Boolean);
  const status = getMatchStatus(match);

  return (
    <div className="fade-in">
      <button onClick={onBack} className="back-btn">
        <span>←</span><span>返回</span>
      </button>

      {photos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <PhotoCarousel photos={photos} />
        </div>
      )}

      <Card>
        <div style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-sm flex-wrap">
            {p.name && (
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>{p.name}</h2>
            )}
            <StatusChip status={status} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4 }}>
            {formatMatchTime(match.createdAt)}
          </div>
        </div>

        <div className="flex flex-wrap gap-sm" style={{ marginBottom: p["my-bio"] ? 16 : 0 }}>
          {buildChips(p).map((c, i) => (
            <HistoryInfoChip key={i} text={c} />
          ))}
        </div>

        {p["my-bio"] && (
          <div>
            <div className="bio-card-label">關於佢</div>
            <p className="bio-card-text">{p["my-bio"]}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------- Helpers ----------------
function HistoryInfoChip({ text }) {
  return <span className="info-chip info-chip-sm">{text}</span>;
}

function StatusChip({ status }) {
  if (!status) return null;
  return <span className={"status-chip " + status.variant}>{status.text}</span>;
}

// Keys are `${myStatus}|${partnerStatus}`. Keep all 16 entries even when text
// duplicates — each cell is independently editable.
const MATCH_STATUS_TABLE = {
  "accept|accept":   { text: "配對成功",     variant: "matched"   },
  "accept|reject":   { text: "配對失敗",     variant: "unmatched" },
  "accept|pending":  { text: "等待對方回覆", variant: "waiting"   },
  "accept|expire":   { text: "配對失敗",     variant: "unmatched" },
  "reject|accept":   { text: "你已拒絕",     variant: "unmatched" },
  "reject|reject":   { text: "你已拒絕",     variant: "unmatched" },
  "reject|pending":  { text: "你已拒絕",     variant: "unmatched" },
  "reject|expire":   { text: "你已拒絕",     variant: "unmatched" },
  "pending|accept":  { text: "等待你的回覆", variant: "waiting"   },
  "pending|reject":  { text: "等待你的回覆", variant: "waiting"   },
  "pending|pending": { text: "等待你的回覆", variant: "waiting"   },
  "pending|expire":  { text: "等待你的回覆", variant: "waiting"   },
  "expire|accept":   { text: "配對失效",     variant: "unmatched" },
  "expire|reject":   { text: "配對失效",     variant: "unmatched" },
  "expire|pending":  { text: "配對失效",     variant: "unmatched" },
  "expire|expire":   { text: "配對失效",     variant: "unmatched" },
};

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  return v === "accept" || v === "reject" || v === "expire" ? v : "pending";
}

function getMatchStatus(match) {
  if (!match) return null;
  const mine    = normalizeStatus(match.myStatus);
  const partner = normalizeStatus(match.partnerStatus);
  return MATCH_STATUS_TABLE[`${mine}|${partner}`];
}

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
    [10, 24, "♎ 天秤座"], [11, 23, "♏ 天蝍座"], [12, 22, "♐ 射手座"],
    [12, 31, "♑ 摩羯座"],
  ];
  for (const [m, dmax, name] of signs) {
    if (month < m || (month === m && day <= dmax)) return name;
  }
  return null;
}

function formatMatchTime(raw) {
  if (!raw) return "";
  let d = new Date(raw);
  if (isNaN(d)) {
    const m = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  }
  if (isNaN(d)) return String(raw);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 配對`;
}
