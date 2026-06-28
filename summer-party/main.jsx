import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ErrorReportLink } from "../shared/error-report-link.jsx";

// ── Event constants ──────────────────────────────────────────────────────────
const WEBHOOK_URL = window.webhookUrl("summer-party");
const LOGO_URL = "/logo.png";
const EVENT_ID = "2026-07-18-summer-party";
const EVENT_NAME = "2026.07.18 Linkinhk 特約 — 初夏 Party";

// ── Draft persistence (localStorage, mirrors member-form pattern) ─────────────
const DRAFT_KEY = "linkinhk-party-2026-07-18-draft-v2";
const DRAFT_DEBOUNCE_MS = 600;
const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // ignore drafts older than 14 days

// ── Option lists — single source of truth from shared-options.js (global) ─────
const UNIVERSITIES = SHARED_UNIVERSITIES;
const MBTI_TYPES = SHARED_MBTI_TYPES;
// MBTI_COLORS uses hex for chip dot styling (same as member-form).
const MBTI_COLORS = {
  INTJ: "#7B68EE", INTP: "#7B68EE", ENTJ: "#CD5C5C", ENTP: "#CD5C5C",
  INFJ: "#3CB371", INFP: "#3CB371", ENFJ: "#3CB371", ENFP: "#3CB371",
  ISTJ: "#4682B4", ISFJ: "#4682B4", ESTJ: "#4682B4", ESFJ: "#4682B4",
  ISTP: "#DAA520", ISFP: "#DAA520", ESTP: "#DAA520", ESFP: "#DAA520",
};

const EMPTY_FORM = {
  isMember: "",        // "yes" (喺) | "no" (唔喺)
  // ── existing-member branch ──
  instagram: "",
  // ── new-member branch ──
  name: "",
  sex: "",             // "male" | "female"
  university: "",      // option id
  overseasUni: "",
  universityOther: "",
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  mbti: "",            // 16-type code or "unsure"
  // ── common ──
  occupation: "",      // 你現時嘅職業 (precise title for this event)
  wantMembership: "",  // "want" (想) | "not_yet" (未需要住)
  consent: false,
};

// Static copy from the partner's final form ──────────────────────────────────
const GAMES = [
  { name: "Find Your Secret Angel", desc: "每人精準安排兩個配對,即場相認" },
  { name: "Best Match Bingooooo", desc: "分三組比賽,用速度了解所有人" },
  { name: "伙記,唔該!", desc: "分兩組比賽,每人一角,合腦力沖杯消暑正嘢飲" },
];
const PERKS = [
  "預先提供在場會員簡介",
  "篩選背景相近參加者",
  "小工具助你輕鬆打開話題",
  "活動前穿搭意見(如需)",
  "提供有酒精及無酒精飲品,要休息就飲啦!",
];
const MEMBERSHIP_POINTS = [
  { title: "大數據配對", desc: "我哋有完善 AI algorithm,分析你同其他會員嘅工作及學歷背景、喜好、性格,甚至外貌,介紹符合你理想型嘅對象" },
  { title: "拍一日拖", desc: "唔使再諗話題,唔使怕被拒絕,我哋根據雙方興趣,直接安排 First date,一邊認識對方,一邊學習新技能" },
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

// A draft is worth restoring once the user has answered anything.
function draftHasContent(f) {
  if (!f) return false;
  return Boolean(
    f.isMember || f.instagram || f.name || f.sex || f.university ||
    f.birthYear || f.birthMonth || f.birthDay || f.mbti ||
    f.occupation || f.wantMembership || f.consent
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

  const set = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: "" } : prev));
  };

  // ── Birthday dropdown data (same construction as member-form) ──
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => String(currentYear - 18 - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const getDaysInMonth = (month, year) => {
    if (!month) return 31;
    return new Date(year ? parseInt(year) : 2000, parseInt(month), 0).getDate();
  };
  const maxDays = getDaysInMonth(form.birthMonth, form.birthYear);
  const days = Array.from({ length: maxDays }, (_, i) => String(i + 1));

  // Restore on mount: rehydrate from localStorage, dismissible notice, wipe stale.
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

  // Autosave (debounced) once restore has run.
  useEffect(() => {
    if (!restoredRef.current) return;
    const t = setTimeout(() => {
      try {
        if (!draftHasContent(form)) return;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 2, savedAt: Date.now(), form }));
      } catch (err) {
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
    if (!form.isMember) e.isMember = "請選擇你是否現有會員";

    if (form.isMember === "yes") {
      if (!form.instagram.trim()) e.instagram = "請填寫你已登記嘅 Instagram Account";
    } else if (form.isMember === "no") {
      if (!form.name.trim()) e.name = "請輸入姓名";
      if (!form.sex) e.sex = "請選擇性別";
      if (!form.university) e.university = "請選擇學院";
      if (form.university === "overseas" && !form.overseasUni.trim()) e.overseasUni = "請填寫";
      if (form.university === "other_uni" && !form.universityOther.trim()) e.universityOther = "請填寫";
      if (!form.birthYear || !form.birthMonth || !form.birthDay) e.birthday = "請選擇完整生日";
      if (!form.mbti) e.mbti = "請選擇你嘅 MBTI";
      if (!form.wantMembership) e.wantMembership = "請選擇";
    }

    if (form.isMember) {
      if (!form.occupation.trim()) e.occupation = "請輸入你現時嘅職業";
      if (!form.consent) e.consent = "請閱讀並同意條款與細則";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resolveUniversity = () => {
    if (form.university === "overseas") return form.overseasUni.trim();
    if (form.university === "other_uni") return form.universityOther.trim();
    const u = UNIVERSITIES.find(x => x.id === form.university);
    return u ? u.label : "";
  };

  const submit = async () => {
    if (!validate()) {
      const firstErr = document.querySelector(".field-error");
      if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitDetail("");

    const isNewMember = form.isMember === "no";
    const body = {
      event_id: EVENT_ID,
      event_name: EVENT_NAME,
      submitted_at: new Date().toISOString(),
      is_existing_member: form.isMember === "yes",
      // existing-member branch
      instagram: form.isMember === "yes" ? form.instagram.trim() : "",
      // new-member branch
      name: isNewMember ? form.name.trim() : "",
      sex: isNewMember ? (form.sex === "male" ? "男" : "女") : "",
      university: isNewMember ? resolveUniversity() : "",
      birthday: isNewMember
        ? `${form.birthYear}-${String(form.birthMonth).padStart(2, "0")}-${String(form.birthDay).padStart(2, "0")}`
        : "",
      mbti: isNewMember ? (form.mbti === "unsure" ? "不清楚" : form.mbti) : "",
      // common
      occupation: form.occupation.trim(),
      want_membership: isNewMember ? (form.wantMembership === "want" ? "想" : "未需要住") : "",
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

  // ── Reusable field controls (same markup/classes as member-form) ──
  const Binary = ({ stateKey, opt1, opt2 }) => (
    <div className="binary-row">
      {[opt1, opt2].map(o => (
        <div
          key={o.val}
          className={`binary-btn ${form[stateKey] === o.val ? "active" : ""}`}
          onClick={() => set(stateKey, o.val)}
        >
          {o.icon && <span className="binary-icon">{o.icon}</span>}
          {o.label}
        </div>
      ))}
    </div>
  );
  const Chip = ({ stateKey, val, label }) => (
    <div className={`chip ${form[stateKey] === val ? "active" : ""}`} onClick={() => set(stateKey, val)}>
      {label}
    </div>
  );
  const ErrorMsg = ({ field }) => (errors[field] ? <div className="field-error">{errors[field]}</div> : null);

  // ── Success screen (image 4) ──
  if (done) {
    return (
      <div className="form-root">
        <div className="form-card">
          <div className="success-screen">
            <div className="success-icon">✓</div>
            <div className="success-title">多謝你嘅報名！🎉</div>
            <div className="success-subtitle">
              成功入選／報名之申請者<br/>
              將會獲得進一步通知。
            </div>
          </div>
        </div>
      </div>
    );
  }

  const answeredMember = form.isMember === "yes" || form.isMember === "no";

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

        <div className="form-header" style={{ justifyContent: "center" }}>
          <img src={LOGO_URL} alt="Link in HK" className="logo-img" />
        </div>

        {showResumeNotice && (
          <div className="resume-notice">
            <span>✓ 已為你保留上次填寫嘅內容</span>
            <button type="button" onClick={discardDraft}>清除重填</button>
          </div>
        )}

        {/* ── Event intro (image 1) ── */}
        <div className="event-top">
          {/* White intro: title + lead paragraphs */}
          <div className="event-intro">
            <div className="event-hero-title">🎉 {EVENT_NAME}</div>
            <div className="event-hero-lead">想認識另一半? Linkinhk 為你舉辦開心交友初夏 Party 🎉</div>
            <div className="event-hero-lead" style={{ marginBottom: 0 }}>
              本次活動特邀擁有接近 10 年舉辦交友活動經驗嘅專業女主持全程帶領!
              透過遊戲同分組小比賽輕鬆開心識新朋友,唔使等 match 🥳
            </div>
          </div>

          {/* Purple card: event details */}
          <div className="event-card">
            <div className="event-meta">
              <div className="event-meta-row"><span className="emo">📅</span><span><b>活動日期：</b>2026 年 7 月 18 日</span></div>
              <div className="event-meta-row"><span className="emo">⏰</span><span><b>活動時間：</b>14:00 - 18:00</span></div>
              <div className="event-meta-row"><span className="emo">📍</span><span><b>活動地點：</b>牛頭角</span></div>
              <div className="event-meta-row"><span className="emo">🍻</span><span><b>活動費用：</b>男 $520 / 女 $488,現有或新加入會員即減 $28!</span></div>
            </div>
            <div className="event-card-note">
              全程無冷場,唔會令你睇望你眼尷尬嘥嘢。E 人 I 人 friendly,主持會照住所有人 😎
            </div>
          </div>

          {/* Purple card: games + perks */}
          <div className="event-card">
            <div className="event-games-title">悄悄話你知有咩玩〜</div>
            <ul className="event-games">
              {GAMES.map(g => (
                <li key={g.name}><b>{g.name}</b> – {g.desc}</li>
              ))}
            </ul>
            <ul className="event-perks">
              {PERKS.map(p => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </div>

        <div className="step-body">
          {/* ── First question (always shown) ── */}
          <div className="field">
            <div className="field-label">你係現有會員嗎? <span className="req">*</span></div>
            <Binary
              stateKey="isMember"
              opt1={{ val: "yes", label: "喺" }}
              opt2={{ val: "no", label: "唔喺" }}
            />
            <ErrorMsg field="isMember" />
          </div>

          {/* Everything below is revealed only after the first question is answered. */}
          {answeredMember && (
            <>
              {form.isMember === "yes" && (
                <>
                  <div className="field">
                    <div className="field-label">你已登記嘅 Instagram Account <span className="req">*</span></div>
                    <input
                      className="text-input"
                      type="text"
                      value={form.instagram}
                      onChange={e => set("instagram", e.target.value)}
                    />
                    <ErrorMsg field="instagram" />
                  </div>

                  <div className="field">
                    <div className="field-label">你現時嘅職業 <span className="req">*</span></div>
                    <input
                      className="text-input"
                      type="text"
                      value={form.occupation}
                      onChange={e => set("occupation", e.target.value)}
                    />
                    <ErrorMsg field="occupation" />
                  </div>
                </>
              )}

              {form.isMember === "no" && (
                <>
                  <div className="field">
                    <div className="field-label">名字／暱稱 <span className="req">*</span></div>
                    <input
                      className="text-input"
                      type="text"
                      value={form.name}
                      onChange={e => set("name", e.target.value)}
                      autoComplete="name"
                    />
                    <ErrorMsg field="name" />
                  </div>

                  <div className="field">
                    <div className="field-label">性別 <span className="req">*</span></div>
                    <Binary
                      stateKey="sex"
                      opt1={{ val: "male", label: "男性", icon: "👨" }}
                      opt2={{ val: "female", label: "女性", icon: "👩" }}
                    />
                    <ErrorMsg field="sex" />
                  </div>

                  <div className="field">
                    <div className="field-label">你現時嘅職業 <span className="req">*</span></div>
                    <input
                      className="text-input"
                      type="text"
                      value={form.occupation}
                      onChange={e => set("occupation", e.target.value)}
                    />
                    <ErrorMsg field="occupation" />
                  </div>

                  <div className="field">
                    <div className="field-label">🎓 你嘅學院 <span className="req">*</span></div>
                    <div className="chip-grid">
                      {UNIVERSITIES.map(u => <Chip key={u.id} stateKey="university" val={u.id} label={u.label} />)}
                    </div>
                    <ErrorMsg field="university" />
                    {form.university === "overseas" && (
                      <div style={{ marginTop: 10 }}>
                        <input className="text-input" value={form.overseasUni} onChange={e => set("overseasUni", e.target.value)} />
                        <ErrorMsg field="overseasUni" />
                      </div>
                    )}
                    {form.university === "other_uni" && (
                      <div style={{ marginTop: 10 }}>
                        <input className="text-input" value={form.universityOther} onChange={e => set("universityOther", e.target.value)} />
                        <ErrorMsg field="universityOther" />
                      </div>
                    )}
                  </div>

                  <div className="field">
                    <div className="field-label">🎂 你嘅生日 <span className="req">*</span></div>
                    <div className="dob-row">
                      <div className="dob-group">
                        <div className="dob-label">年</div>
                        <select className="dob-select" value={form.birthYear} onChange={e => set("birthYear", e.target.value)}>
                          <option value=""></option>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="dob-group">
                        <div className="dob-label">月</div>
                        <select className="dob-select" value={form.birthMonth} onChange={e => set("birthMonth", e.target.value)}>
                          <option value=""></option>
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="dob-group">
                        <div className="dob-label">日</div>
                        <select className="dob-select" value={form.birthDay} onChange={e => set("birthDay", e.target.value)}>
                          <option value=""></option>
                          {days.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <ErrorMsg field="birthday" />
                  </div>

                  <div className="field">
                    <div className="field-label">你嘅 MBTI <span className="req">*</span></div>
                    <div className="mbti-grid">
                      <div className={`mbti-chip unsure-chip ${form.mbti === "unsure" ? "active" : ""}`} onClick={() => set("mbti", "unsure")}>
                        不清楚
                      </div>
                      {MBTI_TYPES.map(t => (
                        <div key={t} className={`mbti-chip ${form.mbti === t ? "active" : ""}`} onClick={() => set("mbti", t)}>
                          <img className="mbti-img" src={`/mbti/${t}.png`} alt={t} />
                          <div className="mbti-label-row">
                            <span className="dot" style={{ background: MBTI_COLORS[t] }} />
                            {t}
                          </div>
                        </div>
                      ))}
                    </div>
                    <ErrorMsg field="mbti" />
                  </div>
                </>
              )}

              {/* ── Membership question (image 3) — new members only ── */}
              {form.isMember === "no" && (
              <div className="field">
                <div className="field-label">你希望加入成為會員嗎?</div>
                <div className="membership-desc">
                  <p>成為會員後,我哋會喺 Party 以外為你安排一對一配對,安排完美 first date! 🎉</p>
                  <p className="membership-promo">加入會員即享是次 Party $28 折扣優惠 ✨</p>
                  <ol>
                    {MEMBERSHIP_POINTS.map((m, i) => (
                      <li key={i}><b>{m.title}</b> – {m.desc}</li>
                    ))}
                  </ol>
                  <p>我哋會稍後安排專人服務真誠想出 pool、搵到對的人嘅你 💖</p>
                </div>
                <div className="option-list" style={{ marginTop: 12 }}>
                  <div className={`option-item ${form.wantMembership === "want" ? "active" : ""}`} onClick={() => set("wantMembership", "want")}>想</div>
                  <div className={`option-item ${form.wantMembership === "not_yet" ? "active" : ""}`} onClick={() => set("wantMembership", "not_yet")}>未需要住</div>
                </div>
                <ErrorMsg field="wantMembership" />
              </div>
              )}

              {/* ── Terms & consent ── */}
              <div className="step-title" style={{ fontSize: 17, margin: "28px 0 8px" }}>條款與細則</div>
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
                <div
                  className={`check-option ${form.consent ? "active" : ""}`}
                  onClick={() => set("consent", !form.consent)}
                >
                  <div className="check-box">{form.consent ? "✓" : ""}</div>
                  <div>我已閱讀並同意以上所有條款與細則</div>
                </div>
                <ErrorMsg field="consent" />
              </div>

              {submitError && (
                <div className="field-error" style={{ marginTop: 12, fontSize: 13 }}>
                  {submitError}
                  <ErrorReportLink detail={submitDetail} />
                </div>
              )}
            </>
          )}
        </div>

        {answeredMember && (
          <div className="nav-row">
            <button className="nav-btn primary" onClick={submit} disabled={submitting}>
              依家即刻報名！
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
