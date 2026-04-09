// ============================================================
// components.js — reusable UI components
// ============================================================

// ---------------- Loading state ----------------
function LoadingScreen({ text = "載入中..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-stone-200 border-t-stone-900 rounded-full spin mb-4"></div>
      <p className="text-sm text-stone-500">{text}</p>
    </div>
  );
}

// ---------------- Error state ----------------
function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-5xl mb-4">⚠️</div>
      <p className="text-stone-700 mb-4">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-stone-900 text-white px-6 py-2 rounded-lg text-sm"
      >
        重新載入
      </button>
    </div>
  );
}

// ---------------- Placeholder for unbuilt tabs ----------------
function Placeholder({ emoji, title }) {
  return (
    <div className="fade-in flex flex-col items-center justify-center py-20">
      <div className="text-6xl mb-4">{emoji}</div>
      <h2 className="text-xl font-semibold text-stone-700 mb-2">{title}</h2>
      <p className="text-sm text-stone-500">建設緊,敬請期待 ✨</p>
    </div>
  );
}

// ---------------- Card wrapper ----------------
function Card({ icon, title, helper, onEdit, children }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 mb-3">
      {(title || onEdit) && (
        <div className="flex items-start justify-between mb-1">
          {title && (
            <h3 className="font-semibold text-stone-900">
              {icon && <span className="mr-1.5">{icon}</span>}
              {title}
            </h3>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-stone-400 hover:text-stone-700 transition p-1 -mt-1 -mr-1"
              title="編輯"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      {helper && (
        <p className="text-xs text-stone-500 mb-3">{helper}</p>
      )}
      {children}
    </div>
  );
}

// ---------------- Display row (read-only inside cards) ----------------
function Row({ label, value, isChips }) {
  const chips = isChips
    ? String(value || "").split(",").map(s => s.trim()).filter(Boolean)
    : [];
  return (
    <div className="py-2.5 border-b border-stone-100 last:border-b-0">
      <div className="text-xs text-stone-500 mb-1">{label}</div>
      {isChips ? (
        chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, i) => (
              <span key={i} className="inline-block px-2.5 py-1 bg-stone-100 text-stone-700 text-xs rounded-full">
                {chip}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-stone-300">—</div>
        )
      ) : (
        <div className="text-stone-900 break-words">
          {value || <span className="text-stone-300">—</span>}
        </div>
      )}
    </div>
  );
}

// ---------------- Toggle switch ----------------
function Toggle({ on, onChange, disabled = false }) {
  return (
    <button
      onClick={!disabled ? onChange : undefined}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
        on ? "bg-yellow-400" : "bg-stone-200"
      } ${disabled ? "opacity-80 cursor-default" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ---------------- Range display (for age/height ranges) ----------------
function RangeDisplay({ min, max, unit }) {
  return (
    <div>
      <div className="text-center font-medium text-stone-900 mb-2">
        {min || "—"}{unit} <span className="text-stone-400 mx-1">至</span> {max || "—"}{unit}
      </div>
      <div className="h-2 range-track rounded-full"></div>
    </div>
  );
}

// ---------------- WantField (for the "What I want" tab) ----------------
function WantField({ label, value, fieldKey, dealBreakers, hideToggle = false, children }) {
  const isDealBreaker = dealBreakers.includes(fieldKey);
  return (
    <div className="py-3 border-b border-stone-100">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-stone-500">{label}</div>
        <div className="flex items-center gap-2">
          {!hideToggle && (
            <>
              <span className="text-[11px] text-stone-400">Deal breaker</span>
              <Toggle on={isDealBreaker} disabled />
            </>
          )}
          <button className="text-stone-400 hover:text-stone-700 transition p-1">
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-stone-900 break-words">
        {children || value || <span className="text-stone-300">—</span>}
      </div>
    </div>
  );
}

// ---------------- Bottom Sheet ----------------
function BottomSheet({ open, title, fields, profile, onClose }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    if (open) {
      const initial = {};
      fields.forEach(f => {
        initial[f.key] = profile[f.key] || "";
      });
      setValues(initial);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    // No-op for now — write workflow comes next iteration
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 fade-in" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-t-2xl flex flex-col fade-in" style={{ maxHeight: "90vh" }}>
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-semibold text-stone-900">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {fields.map(f => (
            <div key={f.key} className="mb-4">
              <label className="block text-xs text-stone-500 mb-1.5">
                {f.label}
                {f.readOnly && <span className="ml-2 text-stone-400">(不可修改)</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  value={values[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  disabled={f.readOnly}
                  rows={4}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition disabled:bg-stone-50 disabled:text-stone-400 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={values[f.key] || ""}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  disabled={f.readOnly}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition disabled:bg-stone-50 disabled:text-stone-400"
                />
              )}
            </div>
          ))}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-5 py-3">
          <button
            onClick={handleSave}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 rounded-lg transition"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
