// ============================================================
// tab-events.js — upcoming events (list of activity cards)
// ============================================================

function EventsTab({ profile, events }) {
  const list = Array.isArray(events) ? events : [];

  if (list.length === 0) {
    return (
      <div className="fade-in flex flex-col items-center justify-center" style={{ padding: "80px 0" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📅</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>仲未有活動</h2>
        <p style={{ fontSize: 14, color: "var(--text-light)" }}>配對成功之後活動就會出現喺度 ✨</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sorted = [...list].sort((a, b) => {
    const da = parseEventDate(a.date);
    const db = parseEventDate(b.date);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    const aPast = da < today;
    const bPast = db < today;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (aPast) return db - da;
    return da - db;
  });

  return (
    <div className="fade-in flex flex-col gap-md">
      {sorted.map((e, i) => (
        <EventCard key={`${e.activity || "event"}-${e.date || ""}-${i}`} event={e} />
      ))}
    </div>
  );
}

// ---------------- Card ----------------
function EventCard({ event }) {
  const status = getEventStatus(event.date);
  const emoji = getActivityEmoji(event.activity);

  return (
    <div className="event-card">
      <div className="event-card-icon">
        <span className="event-card-emoji" aria-hidden="true">{emoji}</span>
      </div>
      <div className="event-card-body">
        <div className="event-card-header">
          {event.activity && <div className="event-card-title">{event.activity}</div>}
          {status && <span className={"status-chip " + status.variant}>{status.text}</span>}
        </div>
        {event.partnerName && (
          <div className="event-card-partner">
            <span className="event-partner-icon" aria-hidden="true">💞</span>
            <span>與 {event.partnerName}</span>
          </div>
        )}
        <div className="event-card-meta">
          {event.date && (
            <div className="event-meta-row">
              <span className="event-meta-icon" aria-hidden="true">📅</span>
              <span>{event.date}</span>
            </div>
          )}
          {event.time && (
            <div className="event-meta-row">
              <span className="event-meta-icon" aria-hidden="true">🕐</span>
              <span>{event.time}</span>
            </div>
          )}
          {event.location && (
            <div className="event-meta-row">
              <span className="event-meta-icon" aria-hidden="true">📍</span>
              <span>{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Helpers ----------------
function parseEventDate(raw) {
  if (!raw) return null;
  const m = String(raw).match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d) ? null : d;
  }
  const d = new Date(raw);
  return isNaN(d) ? null : d;
}

function getEventStatus(rawDate) {
  const d = parseEventDate(rawDate);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day - today) / 86400000);
  if (diff < 0) return { text: "已完成", variant: "unmatched" };
  if (diff === 0) return { text: "今日", variant: "matched" };
  if (diff <= 7) return { text: `${diff}日後`, variant: "matched" };
  return { text: "即將舉行", variant: "waiting" };
}

function getActivityEmoji(activity) {
  const a = String(activity || "").toLowerCase();
  if (/coffee|cafe|咖啡/.test(a)) return "☕";
  if (/workshop|工作坊|手作|班/.test(a)) return "🛠️";
  if (/dinner|lunch|brunch|restaurant|餐|食|飯/.test(a)) return "🍽️";
  if (/bakery|烘焙|麵包|甜品|蛋糕/.test(a)) return "🥐";
  if (/movie|戲|電影/.test(a)) return "🎬";
  if (/hike|行山|遠足|爬山/.test(a)) return "🥾";
  if (/music|concert|演唱會|音樂/.test(a)) return "🎵";
  if (/bar|drink|酒/.test(a)) return "🍷";
  if (/yoga|gym|運動|健身/.test(a)) return "🧘";
  if (/museum|gallery|展|博物/.test(a)) return "🖼️";
  if (/board|game|桌遊|遊戲/.test(a)) return "🎲";
  if (/beach|海/.test(a)) return "🏖️";
  if (/park|公園/.test(a)) return "🌳";
  return "🎉";
}
