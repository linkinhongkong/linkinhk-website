// ============================================================
// dashboard/layout.js — dashboard-only composition components
// (wrappers that compose shared primitives into dashboard-specific
// layouts: Card, Row, RangeDisplay, PhotoCarousel.)
// ============================================================

// ---------------- Card (display wrapper) ----------------
function Card({ icon, title, helper, onEdit, children }) {
  return (
    <div className="dash-card">
      {(title || onEdit) && (
        <div className="dash-card-head">
          {title && (
            <h3 className="dash-card-title">
              {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
              {title}
            </h3>
          )}
          {onEdit && (
            <button onClick={onEdit} className="icon-btn" aria-label="編輯">
              <PencilIcon className="icon-sm" />
            </button>
          )}
        </div>
      )}
      {helper && <p className="dash-card-helper">{helper}</p>}
      {children}
    </div>
  );
}

// ---------------- Row (label + value inside a Card) ----------------
function Row({ label, value, isChips }) {
  const chips = isChips
    ? String(value || "").split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  return (
    <div className="dash-row">
      <div className="dash-row-label">{label}</div>
      {isChips ? (
        chips.length > 0 ? (
          <div className="flex flex-wrap gap-sm">
            {chips.map((chip, i) => (
              <span key={i} className="dash-chip-readonly">{chip}</span>
            ))}
          </div>
        ) : (
          <div className="dash-row-empty">—</div>
        )
      ) : (
        <div className="dash-row-value">
          {value || <span className="dash-row-empty">—</span>}
        </div>
      )}
    </div>
  );
}

// ---------------- RangeDisplay (read-only age/height range) ----------------
function RangeDisplay({ min, max, unit }) {
  return (
    <div>
      <div className="dash-range-value">
        {min || "—"}{unit} <span className="dash-range-dash">至</span> {max || "—"}{unit}
      </div>
      <div className="dash-range-track"></div>
    </div>
  );
}

// ---------------- PhotoCarousel (Match + History tabs) ----------------
function PhotoCarousel({ photos }) {
  const [index, setIndex] = useState(0);
  const valid = photos.filter((p) => p && String(p).trim() !== "");
  const count = valid.length;
  if (count === 0) return null;

  const showLeft = index > 0;
  const showRight = index < count - 1;
  const go = (i) => { if (i >= 0 && i < count) setIndex(i); };

  return (
    <div className="carousel fade-in">
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{ transform: `translateX(calc(${-index * 90}% + 5%))` }}
        >
          {valid.map((url, i) => (
            <div key={i} className="carousel-slide">
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                onError={(e) => { e.target.style.opacity = "0.3"; }}
              />
            </div>
          ))}
        </div>
      </div>
      {showLeft && (
        <button onClick={() => go(index - 1)} className="carousel-arrow left" aria-label="上一張">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="icon-md">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {showRight && (
        <button onClick={() => go(index + 1)} className="carousel-arrow right" aria-label="下一張">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="icon-md">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      {count > 1 && (
        <div className="carousel-dots">
          {valid.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={"carousel-dot" + (i === index ? " active" : "")}
              aria-label={`跳到第 ${i + 1} 張`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
