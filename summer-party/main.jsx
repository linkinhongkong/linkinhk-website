import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ErrorReportLink } from "../shared/error-report-link.jsx";

// ── Event constants ──────────────────────────────────────────────────────────
// One webhook/table can host future events too; event_id/name tag each row.
const WEBHOOK_URL = window.webhookUrl("summer-party");
const LOGO_URL = "/logo.png";
const EVENT_ID = "2026-07-18-summer-party";
const EVENT_NAME = "2026.07.18 Linkinhk 特約初夏 Party";

// ── Draft persistence (localStorage, mirrors member-form pattern) ─────────────
const DRAFT_KEY = "linkinhk-party-2026-07-18-draft-v1";
const DRAFT_DEBOUNCE_MS = 600;
const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // ignore drafts older than 14 days

const EMPTY_FORM = {
  name: "",
  gender: "",       // "男" | "女"
  phone: "",
  occupation: "",
  mbti: "",         // "E" | "I"
  styling: "",      // "需要" | "不需要"
  consent: false,
};

const GENDER_OPTIONS = [
  { val: "男", icon: "👨" },
  { val: "女", icon: "👩" },
];
const MBTI_OPTIONS = [
  { val: "E", icon: "🥳", label: "E 人" },
  { val: "I", icon: "🌙", label: "I 人" },
];
const STYLING_OPTIONS = [
  { val: "需要", icon: "✨" },
  { val: "不需要", icon: "🙆" },
];

const TERMS = [
  {
    title: "相片及影片拍攝 (Photography & Media Consent)",
    body: "參加者知悉並同意,活動期間將進行拍照及錄影,相關相片及影片將有機會保留作未來宣傳及推廣用途。",
  },
  {
    title: "個人安全責任 (Personal Safety Disclaimer)",
    body: "參加者須全權負責其自身的個人、財產及活動期間的安全。",
  },
  {
    title: "報名審核與進一步通知 (Application & Notification)",
    body: "提交表單並不代表成功報名。成功入選／報名之申請者將會獲得進一步通知,屆時請根據指示完成付款以確認名額。",
  },
];

// A draft is worth restoring once the user has typed/picked anything.
function draftHasContent(f) {
  if (!f) return false;
  return Boolean(
    f.name || f.gender || f.phone || f.occupation || f.mbti || f.styling || f.consent
  );
}

function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitDetail, setSubmitDetail] = useState("");
  const [done, setDone] = useState(false);
  const [showResumeNotice, setShowResumeNotice] = useState(false);

  const restoredRef = useRef(false);

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: "" } : prev));
  };

  // Restore on mount: rehydrate fields from localStorage. Silent restore with a
  // dismissible notice (no blocking prompt). Stale drafts are wiped.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        const fresh = draft && draft.savedAt && (Date.now() - draft.savedAt) < DRAFT_TTL_MS;
        if (draft && draft.form && fresh && draftHasContent(draft.form)) {
          setForm(prev => ({ ...prev, ...draft.form }));
          setShowResumeNotice(true);
        } else if (!fresh) {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch (err) {
      console.warn("Draft restore failed:", err);
    }
    restoredRef.current = true;
  }, []);

  // Autosave (debounced): persist every form mutation once restore has run, so we
  // never clobber a restored draft with the initial empty state.
  useEffect(() => {
    if (!restoredRef.current) return;
    const t = setTimeout(() => {
      try {
        if (!draftHasContent(form)) return; // nothing worth saving yet
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          version: 1,
          savedAt: Date.now(),
          form,
        }));
      } catch (err) {
        // QuotaExceeded / private-mode: degrade silently, draft just won't persist.
        console.warn("Draft save failed:", err);
      }
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [form]);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  };

  const discardDraft = () => {
    setShowResumeNotice(false);
    clearDraft();
    setForm(EMPTY_FORM);
    setErrors({});
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "請輸入姓名";
    if (!form.gender) e.gender = "請選擇性別";
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim()) e.phone = "請輸入聯絡電話 / WhatsApp";
    else if (phoneDigits.length < 8) e.phone = "請輸入有效嘅電話號碼";
    if (!form.occupation.trim()) e.occupation = "請輸入現時職業";
    if (!form.mbti) e.mbti = "請選擇你嘅 MBTI 傾向";
    if (!form.styling) e.styling = "請選擇是否需要穿搭意見";
    if (!form.consent) e.consent = "請閱讀並同意條款與細則";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      // Scroll to the first field with an error so nothing fails silently.
      const firstErr = document.querySelector(".field-error");
      if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitDetail("");

    const body = {
      event_id: EVENT_ID,
      event_name: EVENT_NAME,
      submitted_at: new Date().toISOString(),
      name: form.name.trim(),
      gender: form.gender,
      phone: form.phone.trim(),
      occupation: form.occupation.trim(),
      mbti: form.mbti,
      styling_advice: form.styling,
      consent: form.consent,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      let data = null;
      try { data = await res.json(); } catch (_) { /* non-JSON ok */ }

      if (res.ok && (!data || data.success !== false)) {
        clearDraft();
        setDone(true);
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const info = window.describeError(res, { action: "提交", endpoint: "summer-party" });
      setSubmitError((data && (data.error || data.message)) || info.message);
      setSubmitDetail(info.detail);
      setSubmitting(false);
    } catch (err) {
      console.error("Submit error:", err);
      const info = window.describeError(err, { action: "提交", endpoint: "summer-party" });
      setSubmitError(info.message);
      setSubmitDetail(info.detail);
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="form-root">
        <div className="form-card">
          <div className="success-screen">
            <div className="success-icon">✓</div>
            <div className="success-title">多謝報名！🎉</div>
            <div className="success-subtitle">
              我哋已經收到你嘅報名表 💚<br/>
              工作人員會盡快聯絡你,<br/>
              提供活動嘅進一步安排同詳情。
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-root">
      <div className="form-card">
        {submitting && (
          <div className="submitting-overlay">
            <div className="spinner" />
            <div style={{ fontSize: 15, color: "#666", fontWeight: 600 }}>提交緊⋯⋯</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>請稍等 🙏</div>
          </div>
        )}

        <div className="form-header">
          <img src={LOGO_URL} alt="Link in HK" className="logo-img" />
          <div className="step-indicator">報名表單</div>
        </div>

        {showResumeNotice && (
          <div className="resume-notice">
            <span>✓ 已為你保留上次填寫嘅內容</span>
            <button type="button" onClick={discardDraft}>清除重填</button>
          </div>
        )}

        {/* ── Event intro (from partner doc) ── */}
        <div className="event-hero">
          <div className="event-hero-title">🎉 {EVENT_NAME}<br/>官方報名表單</div>
          <div className="event-hero-lead">
            想擴闊社交圈子、告別尷尬對望?本次活動特邀擁有接近 10 年舉辦交友活動經驗嘅專業女主持全程帶領!
            透過遊戲同分組小比賽輕鬆開心交友,一次過見人,唔使等 match 🥳
          </div>
          <div className="event-meta">
            <div className="event-meta-row"><span className="emo">📅</span><span><b>活動日期：</b>2026 年 7 月 18 日</span></div>
            <div className="event-meta-row"><span className="emo">💰</span><span><b>活動費用：</b>男 $498 / 女 $478</span></div>
          </div>
          <ul className="event-perks">
            <li>預先提供在場會員簡介</li>
            <li>篩選背景相近參加者</li>
            <li>小工具助你輕鬆打開話題</li>
            <li>活動前穿搭意見(如需)</li>
            <li>提供有酒精及無酒精飲品,要休息就飲啦!</li>
          </ul>
        </div>

        <div className="step-body">
          {/* ── 第一部分：基本資料 ── */}
          <div className="step-title" style={{ fontSize: 17, marginBottom: 16 }}>第一部分：基本資料</div>

          <div className="field">
            <div className="field-label">姓名 <span className="req">*</span></div>
            <input
              className="text-input"
              type="text"
              value={form.name}
              onChange={e => setField("name", e.target.value)}
              placeholder="你嘅名字"
              autoComplete="name"
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="field">
            <div className="field-label">性別 <span className="req">*</span></div>
            <div className="binary-row">
              {GENDER_OPTIONS.map(o => (
                <button
                  key={o.val}
                  type="button"
                  className={`binary-btn ${form.gender === o.val ? "active" : ""}`}
                  onClick={() => setField("gender", o.val)}
                >
                  <span className="binary-icon">{o.icon}</span>
                  {o.val}
                </button>
              ))}
            </div>
            {errors.gender && <div className="field-error">{errors.gender}</div>}
          </div>

          <div className="field">
            <div className="field-label">聯絡電話 / WhatsApp <span className="req">*</span></div>
            <input
              className="text-input"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={e => setField("phone", e.target.value)}
              placeholder="例如 9123 4567"
              autoComplete="tel"
            />
            {errors.phone && <div className="field-error">{errors.phone}</div>}
          </div>

          <div className="field">
            <div className="field-label">現時職業 <span className="req">*</span></div>
            <input
              className="text-input"
              type="text"
              value={form.occupation}
              onChange={e => setField("occupation", e.target.value)}
              placeholder="例如 市場推廣"
            />
            <div className="field-hint">用作篩選背景相近參加者之用</div>
            {errors.occupation && <div className="field-error">{errors.occupation}</div>}
          </div>

          {/* ── 第二部分：活動配對資料 ── */}
          <div className="step-title" style={{ fontSize: 17, margin: "28px 0 16px" }}>第二部分：活動配對資料</div>

          <div className="field">
            <div className="field-label">您嘅 MBTI 傾向 <span className="req">*</span></div>
            <div className="binary-row">
              {MBTI_OPTIONS.map(o => (
                <button
                  key={o.val}
                  type="button"
                  className={`binary-btn ${form.mbti === o.val ? "active" : ""}`}
                  onClick={() => setField("mbti", o.val)}
                >
                  <span className="binary-icon">{o.icon}</span>
                  {o.label}
                </button>
              ))}
            </div>
            {errors.mbti && <div className="field-error">{errors.mbti}</div>}
          </div>

          <div className="field">
            <div className="field-label">活動當天您是否需要主辦方提供穿搭意見? <span className="req">*</span></div>
            <div className="binary-row">
              {STYLING_OPTIONS.map(o => (
                <button
                  key={o.val}
                  type="button"
                  className={`binary-btn ${form.styling === o.val ? "active" : ""}`}
                  onClick={() => setField("styling", o.val)}
                >
                  <span className="binary-icon">{o.icon}</span>
                  {o.val}
                </button>
              ))}
            </div>
            {errors.styling && <div className="field-error">{errors.styling}</div>}
          </div>

          {/* ── 第三部分：條款與細則 ── */}
          <div className="step-title" style={{ fontSize: 17, margin: "28px 0 8px" }}>第三部分：條款與細則</div>
          <div className="field-hint" style={{ marginBottom: 12 }}>提交本表單即代表您明白並同意以下所有條款：</div>

          <div className="terms-box">
            {TERMS.map((t, i) => (
              <div className="terms-item" key={i}>
                <div className="terms-item-title">{i + 1}. {t.title}</div>
                <div className="terms-item-body">{t.body}</div>
              </div>
            ))}
          </div>

          <div className="field" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className={`check-option ${form.consent ? "active" : ""}`}
              onClick={() => setField("consent", !form.consent)}
              style={{ width: "100%", textAlign: "left" }}
            >
              <span className="check-box">{form.consent ? "✓" : ""}</span>
              <span>我已閱讀並同意以上所有條款與細則</span>
            </button>
            {errors.consent && <div className="field-error">{errors.consent}</div>}
          </div>

          {submitError && (
            <div className="field-error" style={{ marginTop: 12, fontSize: 13 }}>
              {submitError}
              <ErrorReportLink detail={submitDetail} />
            </div>
          )}
        </div>

        <div className="nav-row">
          <button className="nav-btn primary" onClick={submit} disabled={submitting}>
            依家即刻報名！
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
