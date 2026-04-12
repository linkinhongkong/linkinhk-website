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

// ---------------- Form input: text ----------------
function TextField({ label, value, onChange, disabled, placeholder }) {
  return (
    <div className="mb-4">
      <label className="block text-xs text-stone-500 mb-1.5">{label}</label>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition disabled:bg-stone-50 disabled:text-stone-400"
      />
    </div>
  );
}

// ---------------- Form input: textarea ----------------
function TextAreaField({ label, value, onChange, rows = 4, placeholder }) {
  return (
    <div className="mb-4">
      <label className="block text-xs text-stone-500 mb-1.5">{label}</label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition resize-none"
      />
    </div>
  );
}

// ---------------- Form input: number ----------------
function NumberField({ label, value, onChange, min, max, unit }) {
  return (
    <div className="mb-4">
      <label className="block text-xs text-stone-500 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------- Form input: date ----------------
function DateField({ label, value, onChange }) {
  // Airtable Date columns need ISO format (yyyy-mm-dd).
  // Existing legacy data may be in d/m/yyyy format — handle both for display.
  const toInputFormat = (raw) => {
    if (!raw) return "";
    // Already yyyy-mm-dd or ISO datetime
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.substring(0, 10);
    // d/m/yyyy or dd/mm/yyyy (legacy format)
    const m = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return "";
  };

  return (
    <div className="mb-4">
      <label className="block text-xs text-stone-500 mb-1.5">{label}</label>
      <input
        type="date"
        value={toInputFormat(value)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
      />
    </div>
  );
}

// ---------------- Form input: single-select chips ----------------
// Supports "其他/其它" — when that option is picked, a text input appears
// and the typed text becomes the stored value directly.
function SelectChips({ label, options, value, onChange }) {
  // Detect if current value matches a preset option, or is custom (= "其它" was used)
  const presetMatch = options.find(opt => optionToStored(opt) === String(value || ""));
  const otherOption = options.find(opt => opt.label === "其他" || opt.label === "其它");
  const isCustom = !presetMatch && value && otherOption;

  // Track whether "其它" chip should appear selected
  const [otherActive, setOtherActive] = useState(isCustom);

  useEffect(() => {
    setOtherActive(isCustom);
  }, [value]);

  const handleClick = (opt) => {
    if (opt.label === "其他" || opt.label === "其它") {
      setOtherActive(true);
      // Don't clear value if already custom — let user keep editing
      if (!isCustom) onChange("");
    } else {
      setOtherActive(false);
      onChange(optionToStored(opt));
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-xs text-stone-500 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => {
          const stored = optionToStored(opt);
          const isOther = opt.label === "其他" || opt.label === "其它";
          const selected = isOther ? otherActive : (value === stored && !otherActive);
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(opt)}
              className={`px-4 py-2 rounded-full text-sm transition border-2 ${
                selected
                  ? "border-purple-400 bg-purple-50 text-purple-700"
                  : "border-transparent bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {opt.icon && <span className="mr-1">{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
      {otherActive && (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="請輸入..."
          className="mt-3 w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
        />
      )}
    </div>
  );
}

// ---------------- Form input: multi-select grouped chips ----------------
function MultiSelectChips({ label, groups, value, onChange, supportOther, otherValue, onOtherChange, otherLabel = "其他" }) {
  // value is the stored CSV string (e.g. "📖閱讀, 🎮打機")
  // Convert to a Set of stored strings for fast lookup
  const selectedSet = new Set(
    String(value || "").split(",").map(s => s.trim()).filter(Boolean)
  );

  const toggle = (opt) => {
    const stored = optionToStored(opt);
    const newSet = new Set(selectedSet);
    if (newSet.has(stored)) {
      newSet.delete(stored);
    } else {
      newSet.add(stored);
    }
    onChange(Array.from(newSet).join(", "));
  };

  return (
    <div className="mb-4">
      <label className="block text-xs text-stone-500 mb-2">{label}</label>
      {Object.entries(groups).map(([groupName, options]) => (
        <div key={groupName} className="mb-3">
          <div className="text-[11px] font-medium text-stone-400 mb-1.5">{groupName}</div>
          <div className="flex flex-wrap gap-2">
            {options.map((opt, i) => {
              const stored = optionToStored(opt);
              const selected = selectedSet.has(stored);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`px-4 py-2 rounded-full text-sm transition border-2 ${
                    selected
                      ? "border-purple-400 bg-purple-50 text-purple-700"
                      : "border-transparent bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {opt.icon && <span className="mr-1">{opt.icon}</span>}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {supportOther && (
        <div className="mt-3">
          <label className="block text-[11px] text-stone-400 mb-1">{otherLabel}</label>
          <input
            type="text"
            value={otherValue || ""}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="自己加入..."
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
          />
        </div>
      )}
    </div>
  );
}

// ---------------- Form input: rank list (drag-style with up/down arrows) ----------------
// Used for love language: user reorders all options by importance.
// Value is stored as a CSV string in the user's preferred order.
function RankList({ label, options, value, onChange, helper }) {
  // Parse the stored CSV into an ordered array of option objects.
  // If the stored value is missing or partial, fall back to the default order.
  const parseRanked = () => {
    const stored = String(value || "").split(",").map(s => s.trim()).filter(Boolean);
    const matched = stored
      .map(part => options.find(opt => optionToStored(opt) === part))
      .filter(Boolean);
    // Append any options that weren't in the stored value (in their default order)
    const missing = options.filter(opt => !matched.find(m => m.label === opt.label));
    return [...matched, ...missing];
  };

  const [ranked, setRanked] = useState(parseRanked);

  // Re-parse when the underlying value prop changes (e.g. sheet reopened)
  useEffect(() => {
    setRanked(parseRanked());
  }, [value]);

  const move = (idx, direction) => {
    const newRanked = [...ranked];
    const target = idx + direction;
    if (target < 0 || target >= newRanked.length) return;
    [newRanked[idx], newRanked[target]] = [newRanked[target], newRanked[idx]];
    setRanked(newRanked);
    onChange(optionsToCSV(newRanked));
  };

  return (
    <div className="mb-4">
      <label className="block text-xs text-stone-500 mb-1.5">{label}</label>
      {helper && <p className="text-xs text-stone-400 mb-2">{helper}</p>}
      <div className="space-y-2">
        {ranked.map((opt, idx) => (
          <div
            key={opt.label}
            className="flex items-center gap-3 px-3 py-2.5 bg-stone-100 rounded-lg border-2 border-transparent"
          >
            <span className="text-sm font-semibold text-purple-500 w-5 text-center">
              {idx + 1}
            </span>
            <span className="flex-1 text-sm text-stone-700">
              {opt.icon && <span className="mr-1">{opt.icon}</span>}
              {opt.label}
            </span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === ranked.length - 1}
                className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ---------------- Form input: number range (min-max) ----------------
function NumberRange({ label, minValue, maxValue, onMinChange, onMaxChange, unit = "", minLabel = "最低", maxLabel = "最高" }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-stone-900 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-xs text-stone-500 mb-1">{minLabel}</div>
          <div className="relative">
            <input
              type="number"
              value={minValue || ""}
              onChange={(e) => onMinChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
            />
            {unit && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                {unit}
              </span>
            )}
          </div>
        </div>
        <span className="text-stone-400 mt-5">—</span>
        <div className="flex-1">
          <div className="text-xs text-stone-500 mb-1">{maxLabel}</div>
          <div className="relative">
            <input
              type="number"
              value={maxValue || ""}
              onChange={(e) => onMaxChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
            />
            {unit && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Form input: limited multi-select (max N) ----------------
// value is a comma-separated string in DB.
// Blocks new selection when max reached and shows a hint.
function LimitedMultiSelect({ label, options, value, onChange, max = 2, hint }) {
  const selectedSet = new Set(
    String(value || "").split(",").map(s => s.trim()).filter(Boolean)
  );
  const atLimit = selectedSet.size >= max;

  const toggle = (opt) => {
    const stored = optionToStored(opt);
    const newSet = new Set(selectedSet);
    if (newSet.has(stored)) {
      newSet.delete(stored);
    } else {
      if (newSet.size >= max) return; // blocked
      newSet.add(stored);
    }
    onChange(Array.from(newSet).join(", "));
  };

  return (
    <div className="mb-4">
      <label className="block text-xs text-stone-500 mb-2">{label}</label>
      {hint && <p className="text-[11px] text-stone-400 mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => {
          const stored = optionToStored(opt);
          const selected = selectedSet.has(stored);
          const disabled = !selected && atLimit;
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(opt)}
              disabled={disabled}
              className={`px-4 py-2 rounded-full text-sm transition border-2 ${
                selected
                  ? "border-purple-400 bg-purple-50 text-purple-700"
                  : disabled
                  ? "border-transparent bg-stone-50 text-stone-300 cursor-not-allowed"
                  : "border-transparent bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {opt.icon && <span className="mr-1">{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
      {atLimit && (
        <p className="text-[11px] text-purple-500 mt-2">最多揀 {max} 項</p>
      )}
    </div>
  );
}

// ---------------- Deal-breaker toggle row ----------------
function DealBreakerToggle({ on, onChange }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-stone-50 rounded-lg mb-4">
      <div>
        <div className="text-xs font-medium text-stone-700">硬性篩選條件</div>
        <div className="text-[10px] text-stone-400">開啟後,唔符合會直接排除</div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

// ---------------- Want Bottom Sheet ----------------
// Specialized sheet for "我想要" cards. Supports:
//  - NumberRange fields (age/height min+max)
//  - Per-field deal-breaker toggles
//  - LimitedMultiSelect (love language, max 2)
//  - Regular SelectChips (existing for single-selects)
//  - TextAreaField (extra-requirements)
// On save, writes field values AND the updated deal-breaker array in one call.
function WantBottomSheet({ open, title, fields, profile, onClose, onSaved }) {
  const [values, setValues] = useState({});
  const [dealBreakers, setDealBreakers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      const initial = {};
      fields.forEach(f => {
        if (f.type === "range") {
          initial[f.minKey] = profile[f.minKey] || "";
          initial[f.maxKey] = profile[f.maxKey] || "";
        } else {
          initial[f.key] = profile[f.key] || "";
        }
      });
      setValues(initial);
      // Current deal-breaker (can be array or CSV string from Airtable)
      const raw = profile["deal-breaker"];
      const arr = Array.isArray(raw)
        ? [...raw]
        : String(raw || "").split(",").map(s => s.trim()).filter(Boolean);
      setDealBreakers(arr);
      setError(null);
      setSaving(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const setVal = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const toggleDealBreaker = (key) => {
    setDealBreakers(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const updates = {};
    fields.forEach(f => {
      if (f.type === "range") {
        updates[f.minKey] = values[f.minKey] || "";
        updates[f.maxKey] = values[f.maxKey] || "";
      } else {
        updates[f.key] = values[f.key] || "";
      }
    });
    // Send deal-breaker as an array (Airtable Multiple Select accepts array)
    updates["deal-breaker"] = dealBreakers;

    try {
      const res = await authenticatedFetch(
        "https://linkinhk.app.n8n.cloud/webhook/update-profile",
        { method: "POST", body: JSON.stringify({ updates }) }
      );
      const data = await res.json();
      if (data.success && data.profile) {
        if (onSaved) onSaved(data.profile);
        onClose();
      } else {
        setError(data.error || "保存失敗,請再試");
        setSaving(false);
      }
    } catch (err) {
      if (err.message !== "Unauthorized" && err.message !== "No token") {
        setError("網絡連線錯誤");
        setSaving(false);
      }
    }
  };

  const renderField = (f) => {
    const hasDealBreaker = !f.noDealBreaker && f.dealBreakerKey;
    const dbOn = hasDealBreaker && dealBreakers.includes(f.dealBreakerKey);

    let inputEl;
    if (f.type === "range") {
      inputEl = (
        <NumberRange
          label={f.label}
          minValue={values[f.minKey]}
          maxValue={values[f.maxKey]}
          onMinChange={(v) => setVal(f.minKey, v)}
          onMaxChange={(v) => setVal(f.maxKey, v)}
          unit={f.unit}
        />
      );
    } else if (f.type === "select") {
      inputEl = <SelectChips label={f.label} options={f.options} value={values[f.key]} onChange={(v) => setVal(f.key, v)} />;
    } else if (f.type === "limitedmulti") {
      inputEl = <LimitedMultiSelect label={f.label} options={f.options} value={values[f.key]} onChange={(v) => setVal(f.key, v)} max={f.max || 2} hint={f.hint} />;
    } else if (f.type === "textarea") {
      inputEl = <TextAreaField label={f.label} value={values[f.key]} onChange={(v) => setVal(f.key, v)} placeholder={f.placeholder} />;
    } else {
      inputEl = <TextField label={f.label} value={values[f.key]} onChange={(v) => setVal(f.key, v)} />;
    }

    return (
      <div key={f.key || f.minKey} className="pb-2">
        {inputEl}
        {hasDealBreaker && (
          <DealBreakerToggle on={dbOn} onChange={() => toggleDealBreaker(f.dealBreakerKey)} />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 fade-in" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-white w-full max-w-2xl rounded-t-2xl flex flex-col fade-in" style={{ maxHeight: "90vh" }}>
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-semibold text-stone-900">{title}</h3>
          <button onClick={onClose} disabled={saving} className="text-stone-400 hover:text-stone-700 p-1 disabled:opacity-50">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {fields.map(renderField)}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-5 py-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full text-white font-medium py-3 rounded-full transition disabled:opacity-60"
            style={{ background: "linear-gradient(to right, #FF6EB4, #A259FF)" }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Bottom Sheet ----------------
function BottomSheet({ open, title, fields, profile, onClose, onSaved }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      const initial = {};
      fields.forEach(f => {
        initial[f.key] = profile[f.key] || "";
      });
      setValues(initial);
      setError(null);
      setSaving(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const setVal = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Build updates object — only include fields that aren't read-only
    const updates = {};
    fields.forEach(f => {
      if (!f.readOnly) {
        updates[f.key] = values[f.key] || "";
      }
    });

    try {
      const res = await authenticatedFetch(
        "https://linkinhk.app.n8n.cloud/webhook/update-profile",
        {
          method: "POST",
          body: JSON.stringify({ updates })
        }
      );
      const data = await res.json();
      if (data.success && data.profile) {
        if (onSaved) onSaved(data.profile);
        onClose();
      } else {
        setError(data.error || "保存失敗,請再試");
        setSaving(false);
      }
    } catch (err) {
      if (err.message !== "Unauthorized" && err.message !== "No token") {
        setError("網絡連線錯誤");
        setSaving(false);
      }
    }
  };

  // Render the right input component based on field.type
  const renderField = (f) => {
    const val = values[f.key];
    const onChange = (newVal) => setVal(f.key, newVal);

    if (f.readOnly) {
      return (
        <div key={f.key} className="mb-4">
          <label className="block text-xs text-stone-500 mb-1.5">
            {f.label}
            <span className="ml-2 text-stone-400">(不可修改)</span>
          </label>
          <input
            type="text"
            value={val || ""}
            disabled
            className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-400"
          />
        </div>
      );
    }

    switch (f.type) {
      case "textarea":
        return <TextAreaField key={f.key} label={f.label} value={val} onChange={onChange} placeholder={f.placeholder} />;
      case "number":
        return <NumberField key={f.key} label={f.label} value={val} onChange={onChange} unit={f.unit} min={f.min} max={f.max} />;
      case "date":
        return <DateField key={f.key} label={f.label} value={val} onChange={onChange} />;
      case "select":
        return <SelectChips key={f.key} label={f.label} options={f.options} value={val} onChange={onChange} />;
      case "rank":
        return <RankList key={f.key} label={f.label} options={f.options} value={val} onChange={onChange} />;
      case "multiselect":
        return (
          <MultiSelectChips
            key={f.key}
            label={f.label}
            groups={f.groups}
            value={val}
            onChange={onChange}
            supportOther={f.supportOther}
            otherValue={values[f.otherKey]}
            onOtherChange={(v) => setVal(f.otherKey, v)}
            otherLabel={f.otherLabel}
          />
        );
      default:
        return <TextField key={f.key} label={f.label} value={val} onChange={onChange} placeholder={f.placeholder} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 fade-in" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-white w-full max-w-2xl rounded-t-2xl flex flex-col fade-in" style={{ maxHeight: "90vh" }}>
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-semibold text-stone-900">{title}</h3>
          <button onClick={onClose} disabled={saving} className="text-stone-400 hover:text-stone-700 p-1 disabled:opacity-50">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {fields.map(renderField)}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-5 py-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full text-white font-medium py-3 rounded-full transition disabled:opacity-60"
            style={{
              background: "linear-gradient(to right, #FF6EB4, #A259FF)"
            }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
