// ============================================================
// tab-want-cards.js — "我想要" (理想型) read-only cards, blank-state
// CTA, and edit-sheet dispatcher.
//
// Schema lives in /shared/ideal-fields.js (IDEAL_FIELDS). This file
// only renders that schema.
// ============================================================

// ---------------- Deal-breaker chip (read-only badge) ----------------
function DealBreakerChip() {
  return <span className="dash-db-chip">硬性篩選條件</span>;
}

// ---------------- Want display row (scalar / multi / range) ----------------
function WantRow({ label, value, dealBreakerKey, dealBreakers, isRange, rangeMin, rangeMax, rangeUnit }) {
  const isDB = dealBreakerKey && dealBreakers.includes(dealBreakerKey);
  return (
    <div className="dash-row">
      <div className="dash-row-label flex items-center flex-wrap">
        <span>{label}</span>
        {isDB && <DealBreakerChip />}
      </div>
      {isRange ? (
        <div className="dash-row-value">
          {rangeMin || "—"}{rangeUnit} <span style={{ color: "var(--text-light)", margin: "0 4px" }}>至</span> {rangeMax || "—"}{rangeUnit}
        </div>
      ) : (
        <div className="dash-row-value">
          {value || <span className="dash-row-empty">—</span>}
        </div>
      )}
    </div>
  );
}

// ---------------- Priority ranking display (read-only) ----------------
function PriorityDisplay({ value, options }) {
  const ids = String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
  const matched = ids.map((id) => options.find((o) => o.id === id)).filter(Boolean);
  if (matched.length === 0) {
    return <div className="dash-row-value"><span className="dash-row-empty">—</span></div>;
  }
  return (
    <div className="dash-row-value">
      {matched.map((opt, idx) => (
        <div key={opt.id} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
          <span style={{ fontWeight: 600, color: "var(--accent)", minWidth: 18 }}>{idx + 1}.</span>
          <span style={{ fontWeight: 500 }}>{opt.label}</span>
          {opt.helper && <span style={{ color: "var(--text-light)", fontSize: 13 }}>— {opt.helper}</span>}
        </div>
      ))}
    </div>
  );
}

// ---------------- Blank-state CTA ----------------
function IdealBlankState() {
  return (
    <div className="fade-in">
      <div className="dash-card" style={{ textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>💭</div>
        <h3 className="dash-card-title" style={{ justifyContent: "center", marginBottom: 8 }}>
          仲未填寫理想型
        </h3>
        <p style={{ color: "var(--text-light)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          一次過話畀我哋知你想搵點樣嘅人，<br />幫你配對更準 ✨
        </p>
        <button
          onClick={() => { window.location.href = "/ideal-form"; }}
          className="nav-btn primary"
          style={{ width: "100%", maxWidth: 320 }}
        >
          填寫理想型
        </button>
      </div>
    </div>
  );
}

// ---------------- Render a single field row (read-only) ----------------
function renderFieldRow(field, profile, dealBreakers) {
  if (field.type === "range") {
    return (
      <WantRow
        key={field.minKey}
        label={field.label}
        isRange
        rangeMin={profile[field.minKey]}
        rangeMax={profile[field.maxKey]}
        rangeUnit={field.unit}
        dealBreakerKey={field.dealBreakerKey}
        dealBreakers={dealBreakers}
      />
    );
  }
  if (field.type === "rank-id") {
    // The PriorityDisplay renders its own value container — render it
    // alongside the row label rather than wrapping it inside another div.
    return (
      <div key={field.key} className="dash-row">
        <div className="dash-row-label"><span>{field.label}</span></div>
        <PriorityDisplay value={profile[field.key]} options={field.options} />
      </div>
    );
  }
  return (
    <WantRow
      key={field.key}
      label={field.label}
      value={profile[field.key]}
      dealBreakerKey={field.dealBreakerKey}
      dealBreakers={dealBreakers}
    />
  );
}

// ---------------- Main "我想要" tab ----------------
function WhatIWant({ profile, dealBreakers, onProfileUpdated }) {
  const [editingCard, setEditingCard] = useState(null);

  if (isIdealEmpty(profile)) return <IdealBlankState />;

  const openSheet = (cardKey) => setEditingCard(cardKey);
  const closeSheet = () => setEditingCard(null);

  const activeCard = editingCard ? getIdealCard(editingCard) : null;

  return (
    <div className="fade-in">
      {IDEAL_FIELDS.map((card) => (
        <Card
          key={card.cardKey}
          icon={card.icon}
          title={card.title}
          onEdit={() => openSheet(card.cardKey)}
        >
          {card.fields.map((field) => renderFieldRow(field, profile, dealBreakers))}
        </Card>
      ))}

      {activeCard && (
        <WantBottomSheet
          open={true}
          title={"編輯 " + activeCard.icon + " " + activeCard.title}
          fields={activeCard.fields}
          profile={profile}
          onClose={closeSheet}
          onSaved={onProfileUpdated}
        />
      )}
    </div>
  );
}
