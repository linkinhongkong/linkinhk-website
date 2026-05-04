// ============================================================
// shared/components.js — cross-page React primitives
// Used by: dashboard, member-form
// Requires: design-system.css for all visual styling.
// ============================================================

function LoadingScreen({ text = "載入中..." }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: "100dvh" }}>
      <div className="spinner" style={{ marginBottom: "var(--space-lg)" }} />
      <p style={{ fontSize: 14, color: "var(--text-light)" }}>{text}</p>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: "100dvh", padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <p style={{ color: "var(--text)", marginBottom: 16, textAlign: "center" }}>{message}</p>
      <button onClick={() => window.location.reload()} className="btn-pill primary">
        重新載入
      </button>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <ErrorReportLink />
      </div>
    </div>
  );
}

// Inline link rendered next to errors the member can't fix themselves
// (server failures, network issues, unexpected API errors). Hidden for
// validation errors (empty fields, bad format), which the user can fix.
function ErrorReportLink({ variant }) {
  const cls = "error-report-link" + (variant === "on-dark" ? " on-dark" : "");
  return (
    <div className={cls}>
      問題持續?描述一下情況同附上截圖,{" "}
      <a href="https://ig.me/m/linkinhk" target="_blank" rel="noopener noreferrer">
        傳到我哋 IG DM →
      </a>
      <br />我哋會盡快回覆 💜
    </div>
  );
}

function Placeholder({ emoji, title }) {
  return (
    <div className="fade-in flex flex-col items-center justify-center" style={{ padding: "80px 0" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "var(--text-light)" }}>建設緊,敬請期待 ✨</p>
    </div>
  );
}

function Toggle({ on, onChange, disabled = false }) {
  const handle = () => { if (!disabled && onChange) onChange(); };
  return (
    <button type="button" onClick={handle} disabled={disabled} aria-pressed={!!on}
      className={"toggle" + (on ? " on" : "") + (disabled ? " disabled" : "")}>
      <span className="toggle-thumb" />
    </button>
  );
}

function TextField({ label, value, onChange, disabled, placeholder, helper, error }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <input type="text" className="text-input" value={value || ""}
        onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows = 4, placeholder, helper, error, disabled }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <textarea className="text-input" value={value || ""}
        onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} disabled={disabled} />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, unit, helper, error, disabled }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <div style={{ position: "relative" }}>
        <input type="number" className="text-input" value={value || ""}
          onChange={(e) => onChange(e.target.value)} min={min} max={max} disabled={disabled}
          style={unit ? { paddingRight: 40 } : undefined} />
        {unit && (
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 13, color: "var(--text-light)", pointerEvents: "none" }}>{unit}</span>
        )}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function DateField({ label, value, onChange, helper, error, disabled }) {
  const toInputFormat = (raw) => {
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return String(raw).substring(0, 10);
    const m = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) { const [, d, mo, y] = m; return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`; }
    return "";
  };
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <input type="date" className="text-input" value={toInputFormat(value)}
        onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function SelectChips({ label, options, value, onChange, helper, error, allowOther }) {
  const stored = String(value || "");
  const presetMatch = options.find((opt) => optionToStored(opt) === stored);
  const otherOption = options.find((opt) => opt.label === "其他" || opt.label === "其它");
  const isCustom = !presetMatch && value && otherOption;
  const [otherActive, setOtherActive] = useState(isCustom);
  useEffect(() => { setOtherActive(isCustom); }, [value]);
  const handleClick = (opt) => {
    if (opt.label === "其他" || opt.label === "其它") {
      setOtherActive(true);
      if (!isCustom) onChange("");
    } else {
      setOtherActive(false);
      onChange(optionToStored(opt));
    }
  };
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <div className="chip-grid">
        {options.map((opt, i) => {
          const isOther = opt.label === "其他" || opt.label === "其它";
          const selected = isOther ? otherActive : (value === optionToStored(opt) && !otherActive);
          return (
            <button key={i} type="button" onClick={() => handleClick(opt)}
              className={"chip" + (selected ? " active" : "")}>
              {opt.icon && <span className="chip-icon">{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
      {otherActive && (
        <input type="text" className="text-input" value={value || ""}
          onChange={(e) => onChange(e.target.value)} placeholder="請輸入..." style={{ marginTop: 12 }} />
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function MultiSelectChips({ label, groups, value, onChange, helper, error,
  supportOther, otherValue, onOtherChange, otherLabel = "其他" }) {
  const selectedSet = new Set(String(value || "").split(",").map((s) => s.trim()).filter(Boolean));
  const toggle = (opt) => {
    const stored = optionToStored(opt);
    const next = new Set(selectedSet);
    if (next.has(stored)) next.delete(stored); else next.add(stored);
    onChange(Array.from(next).join(", "));
  };
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      {Object.entries(groups).map(([groupName, options]) => (
        <div key={groupName} className="interest-cat">
          {groupName.trim() && <div className="interest-cat-label">{groupName}</div>}
          <div className="chip-grid">
            {options.map((opt, i) => {
              const stored = optionToStored(opt);
              const selected = selectedSet.has(stored);
              return (
                <button key={i} type="button" onClick={() => toggle(opt)}
                  className={"chip" + (selected ? " active" : "")}>
                  {opt.icon && <span className="chip-icon">{opt.icon}</span>}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {supportOther && (
        <div style={{ marginTop: 12 }}>
          <label className="field-hint" style={{ marginBottom: 4 }}>{otherLabel}</label>
          <input type="text" className="text-input" value={otherValue || ""}
            onChange={(e) => onOtherChange(e.target.value)} placeholder="自己加入..." />
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function FlatMultiSelect({ label, options, value, onChange, helper, error }) {
  const selectedSet = new Set(String(value || "").split(",").map((s) => s.trim()).filter(Boolean));
  const toggle = (opt) => {
    const stored = optionToStored(opt);
    const next = new Set(selectedSet);
    if (next.has(stored)) next.delete(stored); else next.add(stored);
    onChange(Array.from(next).join(", "));
  };
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <div className="chip-grid">
        {options.map((opt, i) => {
          const stored = optionToStored(opt);
          const selected = selectedSet.has(stored);
          return (
            <button key={i} type="button" onClick={() => toggle(opt)}
              className={"chip" + (selected ? " active" : "")}>
              {opt.icon && <span className="chip-icon">{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function LimitedMultiSelect({ label, options, value, onChange, max = 2, hint, helper, error }) {
  const selectedSet = new Set(String(value || "").split(",").map((s) => s.trim()).filter(Boolean));
  const atLimit = selectedSet.size >= max;
  const toggle = (opt) => {
    const stored = optionToStored(opt);
    const next = new Set(selectedSet);
    if (next.has(stored)) next.delete(stored);
    else if (next.size < max) next.add(stored);
    else return;
    onChange(Array.from(next).join(", "));
  };
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {(hint || helper) && <p className="field-hint">{hint || helper}</p>}
      <div className="chip-grid">
        {options.map((opt, i) => {
          const stored = optionToStored(opt);
          const selected = selectedSet.has(stored);
          const disabled = !selected && atLimit;
          return (
            <button key={i} type="button" onClick={() => toggle(opt)} disabled={disabled}
              className={"chip" + (selected ? " active" : "") + (disabled ? " disabled" : "")}>
              {opt.icon && <span className="chip-icon">{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
      {atLimit && <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 8 }}>最多揀 {max} 項</p>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

function RankList({ label, options, value, onChange, helper }) {
  const parseRanked = () => {
    const stored = String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
    const matched = stored.map((part) => options.find((opt) => optionToStored(opt) === part)).filter(Boolean);
    const missing = options.filter((opt) => !matched.find((m) => m.label === opt.label));
    return [...matched, ...missing];
  };
  const [ranked, setRanked] = useState(parseRanked);
  useEffect(() => { setRanked(parseRanked()); }, [value]);
  const move = (idx, dir) => {
    const next = [...ranked];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setRanked(next);
    onChange(optionsToCSV(next));
  };
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <div className="rank-list">
        {ranked.map((opt, idx) => (
          <div key={opt.label} className="rank-item">
            <span className="rank-num">{idx + 1}</span>
            <span className="rank-label">
              {opt.icon && <span style={{ marginRight: 4 }}>{opt.icon}</span>}
              {opt.label}
            </span>
            <div className="rank-arrows">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="rank-arrow">▲</button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === ranked.length - 1} className="rank-arrow">▼</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Id-based rank list. Stores a CSV of option ids in the order chosen.
// Each option: { id, label, helper? }. Helper text shown below the label.
function PriorityRank({ label, options, value, onChange, helper }) {
  const parseRanked = () => {
    const stored = String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
    const matched = stored.map((id) => options.find((o) => o.id === id)).filter(Boolean);
    const missing = options.filter((opt) => !matched.find((m) => m.id === opt.id));
    return [...matched, ...missing];
  };
  const [ranked, setRanked] = useState(parseRanked);
  useEffect(() => { setRanked(parseRanked()); /* eslint-disable-next-line */ }, [value]);
  const move = (idx, dir) => {
    const next = [...ranked];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setRanked(next);
    onChange(next.map((o) => o.id).join(", "));
  };
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <div className="rank-list">
        {ranked.map((opt, idx) => (
          <div key={opt.id} className="rank-item">
            <span className="rank-num">{idx + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rank-label">{opt.label}</div>
              {opt.helper && <div className="rank-sublabel">{opt.helper}</div>}
            </div>
            <div className="rank-arrows">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="rank-arrow">▲</button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === ranked.length - 1} className="rank-arrow">▼</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberRange({ label, minValue, maxValue, onMinChange, onMaxChange,
  unit = "", minLabel = "最低", maxLabel = "最高", helper }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {helper && <p className="field-hint">{helper}</p>}
      <div className="range-inputs">
        <div className="range-input-group">
          <div className="range-input-label">{minLabel}</div>
          <div className="range-input-box">
            <input type="number" className="range-input" value={minValue || ""}
              onChange={(e) => onMinChange(e.target.value)} />
            {unit && <span className="range-input-unit">{unit}</span>}
          </div>
        </div>
        <span className="range-input-dash">—</span>
        <div className="range-input-group">
          <div className="range-input-label">{maxLabel}</div>
          <div className="range-input-box">
            <input type="number" className="range-input" value={maxValue || ""}
              onChange={(e) => onMaxChange(e.target.value)} />
            {unit && <span className="range-input-unit">{unit}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function DealBreakerToggle({ on, onChange }) {
  return (
    <div className="deal-breaker-row">
      <div>
        <div className="deal-breaker-title">硬性篩選條件</div>
        <div className="deal-breaker-sub">開啟後,唔符合會直接排除</div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

// ------------------------------------------------------------
// BottomSheet — generic edit modal (dashboard profile edits).
// Now also loads/saves f.otherKey values for multiselect fields
// that support a free-text "Other" input (e.g. my-activities-others).
// ------------------------------------------------------------
function BottomSheet({ open, title, fields, profile, onClose, onSaved }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      const initial = {};
      fields.forEach((f) => {
        initial[f.key] = profile[f.key] || "";
        if (f.otherKey) initial[f.otherKey] = profile[f.otherKey] || "";
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
  const setVal = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const updates = {};
    fields.forEach((f) => {
      if (f.readOnly) return;
      updates[f.key] = values[f.key] || "";
      if (f.otherKey) updates[f.otherKey] = values[f.otherKey] || "";
    });
    try {
      const res = await authenticatedFetch(
        window.webhookUrl("update-profile"),
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
    const val = values[f.key];
    const onCh = (v) => setVal(f.key, v);
    if (f.readOnly) {
      return (
        <div key={f.key} className="field">
          <label className="field-label">
            {f.label}
            <span style={{ color: "var(--text-light)", fontSize: 12, marginLeft: 8, fontWeight: 400 }}>(不可修改)</span>
          </label>
          <input type="text" className="text-input" value={val || ""} disabled />
        </div>
      );
    }
    switch (f.type) {
      case "textarea":
        return <TextAreaField key={f.key} label={f.label} value={val} onChange={onCh} placeholder={f.placeholder} />;
      case "number":
        return <NumberField key={f.key} label={f.label} value={val} onChange={onCh} unit={f.unit} min={f.min} max={f.max} />;
      case "date":
        return <DateField key={f.key} label={f.label} value={val} onChange={onCh} />;
      case "select":
        return <SelectChips key={f.key} label={f.label} options={f.options} value={val} onChange={onCh} />;
      case "rank":
        return <RankList key={f.key} label={f.label} options={f.options} value={val} onChange={onCh} />;
      case "multiselect":
        return (
          <MultiSelectChips key={f.key} label={f.label} groups={f.groups} value={val} onChange={onCh}
            supportOther={f.supportOther} otherValue={values[f.otherKey]}
            onOtherChange={(v) => setVal(f.otherKey, v)} otherLabel={f.otherLabel} />
        );
      default:
        return <TextField key={f.key} label={f.label} value={val} onChange={onCh} placeholder={f.placeholder} />;
    }
  };

  return (
    <div className="sheet-overlay">
      <div className="sheet-backdrop" onClick={!saving ? onClose : undefined} />
      <div className="sheet-panel">
        <div className="sheet-header">
          <h3 className="sheet-title">{title}</h3>
          <button onClick={onClose} disabled={saving} className="icon-btn" aria-label="關閉">
            <CloseIcon className="icon-md" />
          </button>
        </div>
        <div className="sheet-body">
          {fields.map(renderField)}
          {error && (
            <div className="sheet-error">
              {error}
              <ErrorReportLink />
            </div>
          )}
        </div>
        <div className="sheet-footer">
          <button onClick={handleSave} disabled={saving} className="nav-btn primary" style={{ width: "100%" }}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WantBottomSheet({ open, title, fields, profile, onClose, onSaved }) {
  const [values, setValues] = useState({});
  const [dealBreakers, setDealBreakers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      const initial = {};
      fields.forEach((f) => {
        if (f.type === "range") {
          initial[f.minKey] = profile[f.minKey] || "";
          initial[f.maxKey] = profile[f.maxKey] || "";
        } else {
          initial[f.key] = profile[f.key] || "";
        }
      });
      setValues(initial);
      const raw = profile["deal-breaker"];
      const arr = Array.isArray(raw) ? [...raw]
        : String(raw || "").split(",").map((s) => s.trim()).filter(Boolean);
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
  const setVal = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));
  const toggleDB = (k) =>
    setDealBreakers((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const isExtraOnly = fields.length === 1 && fields[0].key === "extra-requirements";
    try {
      if (isExtraOnly) {
        const extraValue = values["extra-requirements"] || "";
        const res = await authenticatedFetch(
          window.webhookUrl("extra-requirements"),
          { method: "POST", body: JSON.stringify({ "extra-requirements": extraValue }) }
        );
        const data = await res.json();
        if (data.success) {
          if (onSaved) onSaved(data.profile || { ...profile, "extra-requirements": extraValue });
          onClose();
        } else {
          setError(data.error || "保存失敗,請再試");
          setSaving(false);
        }
        return;
      }
      const updates = {};
      fields.forEach((f) => {
        if (f.type === "range") {
          updates[f.minKey] = values[f.minKey] || "";
          updates[f.maxKey] = values[f.maxKey] || "";
        } else {
          updates[f.key] = values[f.key] || "";
        }
      });
      updates["deal-breaker"] = dealBreakers;
      const res = await authenticatedFetch(
        window.webhookUrl("update-profile"),
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
    const hasDB = !f.noDealBreaker && f.dealBreakerKey;
    const dbOn = hasDB && dealBreakers.includes(f.dealBreakerKey);
    let inputEl;
    if (f.type === "range") {
      inputEl = (
        <NumberRange label={f.label} minValue={values[f.minKey]} maxValue={values[f.maxKey]}
          onMinChange={(v) => setVal(f.minKey, v)} onMaxChange={(v) => setVal(f.maxKey, v)} unit={f.unit} />
      );
    } else if (f.type === "select") {
      inputEl = <SelectChips label={f.label} options={f.options} value={values[f.key]} onChange={(v) => setVal(f.key, v)} />;
    } else if (f.type === "flatmulti") {
      inputEl = <FlatMultiSelect label={f.label} options={f.options} value={values[f.key]} onChange={(v) => setVal(f.key, v)} />;
    } else if (f.type === "limitedmulti") {
      inputEl = <LimitedMultiSelect label={f.label} options={f.options} value={values[f.key]}
        onChange={(v) => setVal(f.key, v)} max={f.max || 2} hint={f.hint} />;
    } else if (f.type === "rank-id") {
      inputEl = <PriorityRank label={f.label} options={f.options} value={values[f.key]}
        onChange={(v) => setVal(f.key, v)} helper={f.helper} />;
    } else if (f.type === "textarea") {
      inputEl = <TextAreaField label={f.label} value={values[f.key]} onChange={(v) => setVal(f.key, v)} placeholder={f.placeholder} />;
    } else {
      inputEl = <TextField label={f.label} value={values[f.key]} onChange={(v) => setVal(f.key, v)} />;
    }
    return (
      <div key={f.key || f.minKey} style={{ paddingBottom: 8 }}>
        {inputEl}
        {hasDB && <DealBreakerToggle on={dbOn} onChange={() => toggleDB(f.dealBreakerKey)} />}
      </div>
    );
  };

  return (
    <div className="sheet-overlay">
      <div className="sheet-backdrop" onClick={!saving ? onClose : undefined} />
      <div className="sheet-panel">
        <div className="sheet-header">
          <h3 className="sheet-title">{title}</h3>
          <button onClick={onClose} disabled={saving} className="icon-btn" aria-label="關閉">
            <CloseIcon className="icon-md" />
          </button>
        </div>
        <div className="sheet-body">
          {fields.map(renderField)}
          {error && (
            <div className="sheet-error">
              {error}
              <ErrorReportLink />
            </div>
          )}
        </div>
        <div className="sheet-footer">
          <button onClick={handleSave} disabled={saving} className="nav-btn primary" style={{ width: "100%" }}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
