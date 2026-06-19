import React from "react";
import { createRoot } from "react-dom/client";
const { useState, useEffect, useCallback } = React;

// ===================== dashboard/lib.js =====================
// ============================================================
// lib.js — shared utilities, constants, API helpers, icons
// ============================================================


// ---------------- API endpoints ----------------
// webhookUrl() is provided by /shared/config.js; it adds the "uat-" path
// prefix automatically when running on a UAT hostname.
const API = {
  GET_PROFILE: window.webhookUrl("get-profile"),
  BOOTSTRAP: window.webhookUrl("get-dashboard-bootstrap"),
  RESPOND_TO_MATCH: window.webhookUrl("respond-to-match"),
  SAVE_PUSH_SUBSCRIPTION: window.webhookUrl("save-push-subscription"),
  DELETE_PUSH_SUBSCRIPTION: window.webhookUrl("delete-push-subscription"),
};

// ---------------- Tab definitions ----------------
const TAB_IDS = ["match", "events", "history", "profile"];

// ---------------- Profile completeness ----------------
const COMPLETENESS_FIELDS = [
  "my-photo-1", "my-photo-2", "my-photo-3",
  "name", "my-age", "my-occupation",
  "my-bio", "my-activities", "my-hobby",
  "sex", "sexual-orientation","my-height", "my-uni", "instagram",
  "my-MBTI", "my-love-language",
  "my-drinking-habbit", "my-smoking-habbit",
  "my-kids-expectation", "my-religion",
  "email", "phone"
];

function calculateCompleteness(profile) {
  const filled = COMPLETENESS_FIELDS.filter(key => {
    const val = profile[key];
    return val !== undefined && val !== null && String(val).trim() !== "";
  }).length;
  const total = COMPLETENESS_FIELDS.length;
  const missing = total - filled;
  const percent = Math.round((filled / total) * 100);
  return { filled, total, missing, percent };
}

// ---------------- Auth helpers ----------------
function getToken() {
  return localStorage.getItem("linkinhk_token");
}

function clearAuth() {
  localStorage.removeItem("linkinhk_token");
  localStorage.removeItem("linkinhk_email");
}

function redirectToLogin() {
  const target = window.location.pathname + window.location.search + window.location.hash;
  window.location.href = "/login?redirect=" + encodeURIComponent(target);
}

// ---------------- Impersonation (admin "view as user") ----------------
// When an admin opens the dashboard via the admin portal's "view as user"
// button, the short-lived impersonation session token arrives in the URL hash:
//   /dashboard#impersonate=<token>&email=<email>
// We move it into localStorage (backing up any real session first) and strip
// the hash so the token never lingers in the URL/history. A persistent banner
// then makes the mode obvious and offers a one-tap exit.
const IMP_FLAG = "linkinhk_impersonation";
const IMP_TOKEN_BACKUP = "linkinhk_token_backup";
const IMP_EMAIL_BACKUP = "linkinhk_email_backup";

function captureImpersonationFromHash() {
  const hash = window.location.hash || "";
  if (hash.indexOf("impersonate=") === -1) return;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("impersonate");
  const email = params.get("email") || "";
  if (!token) return;

  // Back up any existing real session so exiting restores it (same-origin
  // localStorage is shared with the admin portal).
  const prevToken = localStorage.getItem("linkinhk_token");
  if (prevToken && prevToken !== token) {
    localStorage.setItem(IMP_TOKEN_BACKUP, prevToken);
    localStorage.setItem(IMP_EMAIL_BACKUP, localStorage.getItem("linkinhk_email") || "");
  }
  localStorage.setItem("linkinhk_token", token);
  localStorage.setItem("linkinhk_email", email);
  localStorage.setItem(IMP_FLAG, email || "1");

  // Drop the token from the URL/history immediately.
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

function isImpersonating() {
  return !!localStorage.getItem(IMP_FLAG);
}

function exitImpersonation() {
  localStorage.removeItem(IMP_FLAG);
  const backup = localStorage.getItem(IMP_TOKEN_BACKUP);
  if (backup) {
    localStorage.setItem("linkinhk_token", backup);
    localStorage.setItem("linkinhk_email", localStorage.getItem(IMP_EMAIL_BACKUP) || "");
    localStorage.removeItem(IMP_TOKEN_BACKUP);
    localStorage.removeItem(IMP_EMAIL_BACKUP);
  } else {
    clearAuth();
  }
  // The tab was opened by the admin portal; try to close it, and fall back to
  // the admin portal if the browser blocks window.close().
  window.close();
  window.location.href = "/admin";
}

// Consume the impersonation hash before React mounts so the token is in
// localStorage in time for the first authenticated fetch.
captureImpersonationFromHash();

// ---------------- API helper ----------------
async function authenticatedFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    throw new Error("No token");
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    clearAuth();
    redirectToLogin();
    throw new Error("Unauthorized");
  }

  return res;
}

// ---------------- Web Push helpers ----------------
// applicationServerKey must be a Uint8Array; the VAPID public key is base64url.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function pushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// iOS only allows push from an installed (standalone) PWA, iOS 16.4+.
function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

// Returns: 'unsupported' | 'ios-needs-install' | 'default' | 'granted' | 'denied'
function getPushState() {
  if (isIos() && !isStandalone()) return "ios-needs-install";
  if (!pushSupported()) return "unsupported";
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Must be called from a user gesture (button click).
async function enablePushNotifications() {
  if (!pushSupported()) throw new Error("unsupported");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY),
    });
  }
  await savePushSubscription(sub);
  return sub;
}

async function savePushSubscription(sub) {
  const res = await authenticatedFetch(API.SAVE_PUSH_SUBSCRIPTION, {
    method: "POST",
    body: JSON.stringify({
      email: localStorage.getItem("linkinhk_email"),
      subscription: sub.toJSON(), // { endpoint, expirationTime, keys: { p256dh, auth } }
      userAgent: navigator.userAgent,
    }),
  });
  return res.json();
}

async function disablePushNotifications() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await authenticatedFetch(API.DELETE_PUSH_SUBSCRIPTION, {
    method: "POST",
    body: JSON.stringify({
      email: localStorage.getItem("linkinhk_email"),
      endpoint: sub.endpoint,
    }),
  });
  await sub.unsubscribe();
}

// Whether the current browser already has an active push subscription.
async function hasPushSubscription() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

// ---------------- Install / "Add to Home Screen" helpers ----------------
// "Add to Home Screen" only works in real iOS Safari — not Chrome/Firefox on
// iOS, and not in-app webviews (Instagram/FB/Line), where it is impossible.
function isIosSafari() {
  if (!isIos()) return false;
  const ua = navigator.userAgent;
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|mercury/i.test(ua);
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|Line|Twitter|MicroMessenger|TikTok/i.test(ua);
  return !otherBrowser && !inApp;
}

// 'installed' | 'native' | 'ios-safari' | 'ios-other' | 'none'
function getInstallState() {
  if (isStandalone()) return "installed";
  if (window.deferredInstallPrompt) return "native"; // Android / desktop Chrome
  if (isIos()) return isIosSafari() ? "ios-safari" : "ios-other";
  return "none";
}

// Fires the browser's native install prompt (Android / desktop Chrome).
async function triggerNativeInstall() {
  const p = window.deferredInstallPrompt;
  if (!p) return false;
  p.prompt();
  let accepted = false;
  try { const choice = await p.userChoice; accepted = choice && choice.outcome === "accepted"; }
  catch (e) { /* ignore */ }
  window.deferredInstallPrompt = null;
  return accepted;
}

// ---------------- Promo banner snooze (localStorage) ----------------
function snoozePromo(key, days) {
  const d = days || 7;
  localStorage.setItem("linkinhk_promo_" + key + "_until", String(Date.now() + d * 86400000));
}
function promoSnoozed(key) {
  const v = localStorage.getItem("linkinhk_promo_" + key + "_until");
  return !!v && Date.now() < Number(v);
}

// Which top banner to show: 'notif' | 'install' | 'none'.
// Notifications take priority when they can be enabled right now; otherwise we
// surface install (required on iOS for push, optional elsewhere).
function getPromoState() {
  const canNotif = pushSupported() && Notification.permission === "default" && !promoSnoozed("notif");
  if (canNotif && !(isIos() && !isStandalone())) return "notif";
  if (!isStandalone()) {
    const inst = getInstallState();
    if ((inst === "native" || inst === "ios-safari" || inst === "ios-other") && !promoSnoozed("install"))
      return "install";
  }
  return "none";
}

// ---------------- Icon components ----------------
const HeartIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);
const CalendarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const HistoryIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const UserIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const PencilIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const LogoutIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const CloseIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const BellIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const ShareIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6" />
  </svg>
);
const HomePlusIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5L12 4l9 7.5M5.5 10v9a1 1 0 001 1H10v-5h4v5h3.5a1 1 0 001-1v-9" />
  </svg>
);

// ---------------- Tab metadata ----------------
const TABS = [
  { id: "match", label: "配對", Icon: HeartIcon },
  { id: "events", label: "活動", Icon: CalendarIcon },
  { id: "history", label: "紀錄", Icon: HistoryIcon },
  { id: "profile", label: "我", Icon: UserIcon },
];

// ===================== shared/components.js =====================
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

// ===================== dashboard/layout.js =====================
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
function PhotoCarousel({ photos, emptyText }) {
  const [index, setIndex] = useState(0);
  const valid = photos.filter((p) => p && String(p).trim() !== "");
  const count = valid.length;
  if (count === 0) {
    return (
      <div className="carousel fade-in">
        <div className="carousel-viewport">
          <div className="carousel-empty">
            <div className="carousel-empty-icon" aria-hidden="true">📷</div>
            <div className="carousel-empty-text">{emptyText || "未有圖片"}</div>
          </div>
        </div>
      </div>
    );
  }

  const wrap = (i) => ((i % count) + count) % count;
  const go = (i) => setIndex(wrap(i));

  const centerIdx = wrap(index);
  const rightIdx = count >= 2 ? wrap(index + 1) : null;
  const leftIdx = count >= 3 ? wrap(index - 1) : null;

  return (
    <div className="carousel fade-in">
      <div className="carousel-viewport">
        {leftIdx !== null && (
          <div className="carousel-slide peek left">
            <img
              src={valid[leftIdx]}
              alt=""
              onError={(e) => { e.target.style.opacity = "0.3"; }}
            />
          </div>
        )}
        {rightIdx !== null && (
          <div className="carousel-slide peek right">
            <img
              src={valid[rightIdx]}
              alt=""
              onError={(e) => { e.target.style.opacity = "0.3"; }}
            />
          </div>
        )}
        <div className="carousel-slide center">
          <img
            src={valid[centerIdx]}
            alt={`Photo ${centerIdx + 1}`}
            onError={(e) => { e.target.style.opacity = "0.3"; }}
          />
        </div>
      </div>
      {count > 1 && (
        <div className="carousel-controls">
          <button onClick={() => go(index - 1)} className="carousel-arrow" aria-label="上一張">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="icon-sm">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="carousel-dots">
            {valid.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={"carousel-dot" + (i === centerIdx ? " active" : "")}
                aria-label={`跳到第 ${i + 1} 張`}
              />
            ))}
          </div>
          <button onClick={() => go(index + 1)} className="carousel-arrow" aria-label="下一張">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="icon-sm">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ===================== dashboard/tab-match.js =====================
// ============================================================
// tab-match.js — the Match tab (default landing tab)
// ============================================================

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
    { name: "天蝍座", emoji: "♏", from: [10, 23], to: [11, 21] },
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

// ---------------- Info chips ----------------
function MatchInfoChip({ children }) {
  return <span className="info-chip">{children}</span>;
}

function InfoChipsRow({ partner }) {
  const age = ageFromDOB(partner["my-age"]);
  const zodiac = zodiacFromDOB(partner["my-age"]);
  const chips = [];
  if (age != null) chips.push(<MatchInfoChip key="age">🎂 {age}歲</MatchInfoChip>);
  if (partner["my-height"]) chips.push(<MatchInfoChip key="h">📏 {partner["my-height"]}cm</MatchInfoChip>);
  if (partner["my-occupation"]) chips.push(<MatchInfoChip key="occ">{partner["my-occupation"]}</MatchInfoChip>);
  if (partner["my-uni"]) chips.push(<MatchInfoChip key="uni">🎓 {partner["my-uni"]}</MatchInfoChip>);
  if (zodiac) chips.push(<MatchInfoChip key="z">{zodiac.emoji} {zodiac.name}</MatchInfoChip>);
  if (partner["my-MBTI"]) chips.push(<MatchInfoChip key="mbti">{partner["my-MBTI"]}</MatchInfoChip>);
  if (partner["my-religion"]) chips.push(<MatchInfoChip key="r">⛪ {partner["my-religion"]}</MatchInfoChip>);
  if (chips.length === 0) return null;
  return <div className="flex flex-wrap gap-sm mb-lg">{chips}</div>;
}

// ---------------- Countdown card ----------------
function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function CountdownCard({ deadline }) {
  const target = deadline ? new Date(deadline).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || isNaN(target)) return null;

  const remaining = target - now;
  const expired = remaining <= 0;

  return (
    <div className={"countdown-card" + (expired ? " expired" : "")}>
      {expired
        ? "已過期"
        : <>請在48小時內回覆: <span className="countdown-card-time">{formatCountdown(remaining)}</span></>}
    </div>
  );
}

// ---------------- Membership gate ----------------
function MembershipGate() {
  const [copied, setCopied] = useState(false);
  const phone = "91878330";

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(phone);
      } else {
        const ta = document.createElement("textarea");
        ta.value = phone;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <div className="membership-gate">
      <div className="membership-gate-header">
        <div className="membership-gate-emoji">💌</div>
        <div className="membership-gate-title">仲未係會員</div>
        <div className="membership-gate-sub">
          完成以下兩個簡單步驟,即可開始收到每週配對 ✨
        </div>
      </div>

      <div className="membership-step">
        <div className="membership-step-title">
          <span className="membership-step-num">1</span>
          用 PayMe / FPS 入會
        </div>
        <div className="membership-step-body">
          <p>請透過 PayMe 或 FPS 轉數$198至以下號碼:</p>
          <div className="membership-pay-row">
            <span className="membership-pay-number">{phone}</span>
            <button
              type="button"
              onClick={handleCopy}
              className={"membership-copy-btn" + (copied ? " copied" : "")}
            >
              {copied ? "已複製 ✓" : "複製"}
            </button>
          </div>
        </div>
      </div>

      <div className="membership-step">
        <div className="membership-step-title">
          <span className="membership-step-num">2</span>
          IG DM 我哋確認
        </div>
        <div className="membership-step-body">
          <p>
            完成付款後,請於 Instagram DM 我哋:
            {" "}
            <a
              href="https://instagram.com/linkinhk"
              target="_blank"
              rel="noopener noreferrer"
              className="membership-ig"
            >
              @linkinhk
            </a>
          </p>
          <p>我哋會盡快幫你開通會員 💚</p>
        </div>
      </div>
    </div>
  );
}

// ---------------- Bio card ----------------
function BioCard({ bio }) {
  if (!bio || String(bio).trim() === "") return null;
  return (
    <div className="bio-card fade-in">
      <div className="bio-card-label">關於佢</div>
      <p className="bio-card-text">{bio}</p>
    </div>
  );
}

// ---------------- Toast ----------------
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return <div className="toast-neutral">{message}</div>;
}

// ---------------- Action buttons ----------------
function ActionButtons({ onAccept, onReject, disabled }) {
  return (
    <div className="match-actions fade-in">
      <button onClick={onReject} disabled={disabled} className="btn-pill secondary">
        無興趣
      </button>
      <button onClick={onAccept} disabled={disabled} className="btn-pill primary">
        想認識 💚
      </button>
    </div>
  );
}

// ---------------- Empty state ----------------
function NoMatchState({ rejected }) {
  if (rejected) {
    return (
      <div className="flex flex-col items-center justify-center fade-in" style={{ padding: "60px 16px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💚</div>
        <p style={{ color: "var(--text)", fontSize: 15, textAlign: "center", maxWidth: 360, lineHeight: 1.7, marginBottom: 24 }}>
          如果今次配對未係你想認識嘅類型,你可以到會員中心更新理想對象,或者直接{" "}
          <a
            href="https://instagram.com/linkinhk"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", fontWeight: 600 }}
          >
            DM 我哋
          </a>
          ,等 AI 之後幫你配得更準 ✨
        </p>
        <button
          type="button"
          onClick={() => { window.location.hash = "ideal"; }}
          className="btn-pill primary"
        >
          更新理想對象
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center fade-in" style={{ padding: "80px 0" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💌</div>
      <p style={{ color: "var(--text)", fontWeight: 500, marginBottom: 4 }}>你嘅配對準備緊</p>
      <p style={{ color: "var(--text-light)", fontSize: 14, textAlign: "center", maxWidth: 300 }}>
        新配對一出爐,我哋會發電郵通知你。記得開啟通知,第一時間收到你嘅配對 ✨
      </p>
    </div>
  );
}

// ---------------- Main Match tab ----------------
function MatchTab({ profile, currentMatch, onMatchResponded }) {
  const [toast, setToast] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [responded, setResponded] = useState(false);
  const [justRejected, setJustRejected] = useState(false);

  const handleResponse = async (response) => {
    if (submitting || !currentMatch) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await authenticatedFetch(API.RESPOND_TO_MATCH, {
        method: "POST",
        body: JSON.stringify({
          response,
          side: currentMatch.mySide,
          partnerEmail: currentMatch.partnerProfile.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(response === "accept" ? "已回覆: 想認識 💚" : "已回覆: 無興趣");
        setResponded(true);
        if (response === "reject") setJustRejected(true);
        if (onMatchResponded) onMatchResponded();
      } else {
        setActionError(data.error || "出錯,請再試");
        setSubmitting(false);
      }
    } catch (err) {
      if (err.message !== "Unauthorized" && err.message !== "No token") {
        setActionError("網絡連線錯誤");
      }
      setSubmitting(false);
    }
  };

  const membership = String((profile && profile.membership) || "").toLowerCase();
  if (membership !== "activated" && membership !== "force-match") {
    return <MembershipGate />;
  }

  const myStatus = String((currentMatch && currentMatch.myStatus) || "").toLowerCase();
  if (responded || !currentMatch || !currentMatch.partnerProfile || myStatus !== "pending") {
    return (
      <>
        <NoMatchState rejected={justRejected} />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </>
    );
  }

  const partner = currentMatch.partnerProfile;
  const photos = [partner["my-photo-1"], partner["my-photo-2"], partner["my-photo-3"]];
  const deadline = currentMatch.deadlineAt;

  return (
    <div className="fade-in" style={{ paddingBottom: 16 }}>
      {deadline && <CountdownCard deadline={deadline} />}

      <div style={{ marginBottom: 16 }}>
        <PhotoCarousel photos={photos} emptyText="對方沒有上傳圖片" />
      </div>

      <Card>
        {partner.name && (
          <div className="match-name-row">
            <h2 className="match-name">{partner.name}</h2>
          </div>
        )}
        <InfoChipsRow partner={partner} />
        {partner["my-bio"] && String(partner["my-bio"]).trim() !== "" && (
          <div style={{ marginBottom: 16 }}>
            <div className="bio-card-label">關於佢</div>
            <p className="bio-card-text">{partner["my-bio"]}</p>
          </div>
        )}
        {actionError && (
          <div className="sheet-error">
            {actionError}
            <ErrorReportLink />
          </div>
        )}
        <ActionButtons
          onAccept={() => handleResponse("accept")}
          onReject={() => handleResponse("reject")}
          disabled={submitting}
        />
      </Card>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

// ===================== dashboard/tab-events.js =====================
// ============================================================
// tab-events.js — upcoming events (list of activity cards)
// ============================================================

function EventsTab({ profile, events }) {
  const list = (Array.isArray(events) ? events : []).filter(
    (e) => e && (e.activity || e.date || e.time || e.location || e.partnerName)
  );

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

// ===================== dashboard/tab-history.js =====================
// ============================================================
// tab-history.js — match history (list + detail view)
// ============================================================

function HistoryTab({ profile, history }) {
  const [selected, setSelected] = useState(null);

  const seen = new Set();
  const uniqueHistory = (history || []).filter((m) => {
    const partnerName = (m.partnerProfile && m.partnerProfile.name) || "";
    if (!partnerName.trim()) return false;
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
  "accept|reject":   { text: "配對失敗(對方拒絕)",   variant: "unmatched" },
  "accept|pending":  { text: "等待對方回覆", variant: "waiting"   },
  "accept|expire":   { text: "配對失敗(對方沒有回覆)", variant: "unmatched" },
  "reject|accept":   { text: "你已拒絕",     variant: "unmatched" },
  "reject|reject":   { text: "你已拒絕",     variant: "unmatched" },
  "reject|pending":  { text: "你已拒絕",     variant: "unmatched" },
  "reject|expire":   { text: "你已拒絕",     variant: "unmatched" },
  "pending|accept":  { text: "等待你的回覆", variant: "waiting"   },
  "pending|reject":  { text: "等待你的回覆", variant: "waiting"   },
  "pending|pending": { text: "等待你的回覆", variant: "waiting"   },
  "pending|expire":  { text: "等待你的回覆", variant: "waiting"   },
  "expire|accept":   { text: "配對失敗(你沒有回覆)", variant: "unmatched" },
  "expire|reject":   { text: "配對失敗(你沒有回覆)", variant: "unmatched" },
  "expire|pending":  { text: "配對失敗(你沒有回覆)", variant: "unmatched" },
  "expire|expire":   { text: "配對失敗(你沒有回覆)", variant: "unmatched" },
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

// ===================== dashboard/tab-profile-cards.js =====================
// ============================================================
// tab-profile-cards.js — WhoIAm profile cards + edit sheets
// ============================================================

const UPDATE_BIO_URL = window.webhookUrl("update-bio");
const UPDATE_PHOTO_URL = window.webhookUrl("update-photo");

function authPostCustom(url, body, isFormData) {
  const token = getToken() || "";
  const headers = { "Authorization": "Bearer " + token };
  if (!isFormData) headers["Content-Type"] = "application/json";
  return fetch(url, {
    method: "POST",
    headers,
    body: isFormData ? body : JSON.stringify(body),
  }).then((res) => res.json());
}

// ---------------- Card edit configs (for standard BottomSheet) ----------------
const PROFILE_CARD_CONFIGS = {
  summary: {
    title: "編輯個人簡介",
    fields: [
      { key: "name", label: "姓名" },
      { key: "sex", label: "性別", readOnly: true },
      { key: "my-age", label: "出生日期", readOnly: true },
      { key: "my-occupation", label: "職業", type: "select", options: OPTIONS.occupation },
      { key: "my-uni", label: "大學", type: "select", options: OPTIONS.university },
      { key: "my-height", label: "身高", type: "number", unit: "cm", min: 100, max: 250 },
      {
        key: "sexual-orientation",
        label: "性取向",
        type: "multiselect",
        groups: { " ": [{ label: "異性戀" }, { label: "同性戀" }, { label: "雙性戀" }] },
      },
    ]
  },
  about: {
    title: "編輯 ✨ 讓人更了解你",
    fields: [
      {
        key: "my-activities",
        label: "想一齊做嘅活動",
        type: "multiselect",
        groups: ACTIVITY_GROUPS,
        supportOther: true,
        otherKey: "my-activities-others",
        otherLabel: "其他想法"
      },
      { key: "my-hobby", label: "興趣", type: "multiselect", groups: HOBBY_GROUPS },
    ]
  },
  personality: {
    title: "編輯 🧠 個性 & 相處",
    fields: [
      { key: "my-MBTI", label: "MBTI", type: "select", options: OPTIONS.mbti },
      { key: "my-love-language", label: "愛的語言", type: "rank", options: OPTIONS.loveLanguage },
    ]
  },
  lifestyle: {
    title: "編輯 🌿 生活習慣",
    fields: [
      { key: "my-drinking-habbit", label: "飲酒習慣", type: "select", options: OPTIONS.drinking },
      { key: "my-smoking-habbit", label: "吸煙習慣", type: "select", options: OPTIONS.smoking },
    ]
  },
  relationship: {
    title: "編輯 💛 關係觀",
    fields: [
      { key: "my-kids-expectation", label: "對小朋友的想法", type: "select", options: OPTIONS.kids },
      { key: "my-religion", label: "宗教", type: "select", options: OPTIONS.religion },
    ]
  },
  account: {
    title: "編輯 ⚙️ 帳戶設定",
    fields: [
      { key: "email", label: "電郵", readOnly: true },
      { key: "instagram", label: "Instagram" },
      { key: "phone", label: "電話" },
    ]
  },
};

// ---------------- Small helpers ----------------
function ProfileChip({ label }) {
  if (!label) return null;
  return <span className="dash-chip-readonly">{label}</span>;
}

function PhotoCell({ url, alt, className }) {
  return (
    <div className={"photo-cell " + (className || "")}>
      {url ? (
        <img src={url} alt={alt} />
      ) : (
        <div className="photo-cell-empty">無相片</div>
      )}
    </div>
  );
}

// ---------------- Bio edit sheet ----------------
function BioEditSheet({ open, currentBio, onClose, onSaved }) {
  const [text, setText] = useState(currentBio || "");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = () => {
    setSaving(true);
    authPostCustom(UPDATE_BIO_URL, { bio: text })
      .then((result) => {
        setSaving(false);
        if (result && result.success && result.profile && onSaved) onSaved(result.profile);
        onClose();
      })
      .catch((e) => { console.error("Bio save error:", e); setSaving(false); onClose(); });
  };

  return (
    <div className="sheet-overlay">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel">
        <div className="sheet-header">
          <h3 className="sheet-title">編輯自我介紹</h3>
          <button onClick={onClose} className="icon-btn" aria-label="關閉">
            <CloseIcon className="icon-md" />
          </button>
        </div>
        <div className="sheet-body">
          <textarea
            className="text-input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="講少少關於你..."
            style={{ resize: "none" }}
          />
        </div>
        <div className="sheet-footer">
          <button
            onClick={handleSave}
            disabled={saving}
            className="nav-btn primary"
            style={{ width: "100%" }}
          >
            {saving ? "儲存中⋯" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Photo edit sheet ----------------
function PhotoEditSheet({ open, photos, onClose, onSaved }) {
  const [previews, setPreviews] = useState([null, null, null]);
  const [files, setFiles] = useState([null, null, null]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleFile = (idx, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const newFiles = [files[0], files[1], files[2]];
    newFiles[idx] = file;
    setFiles(newFiles);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newPreviews = [previews[0], previews[1], previews[2]];
      newPreviews[idx] = ev.target.result;
      setPreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaving(true);
    const uploads = [];
    for (let i = 0; i < 3; i++) {
      if (files[i]) uploads.push({ idx: i, file: files[i] });
    }
    if (uploads.length === 0) { onClose(); return; }

    const uploadNext = (pos) => {
      if (pos >= uploads.length) {
        setSaving(false);
        if (onSaved) onSaved();
        onClose();
        return;
      }
      const item = uploads[pos];
      const formData = new FormData();
      formData.append("photoIndex", String(item.idx + 1));
      formData.append("photo", item.file);
      authPostCustom(UPDATE_PHOTO_URL, formData, true)
        .then(() => uploadNext(pos + 1))
        .catch((e) => { console.error("Photo upload error:", e); uploadNext(pos + 1); });
    };
    uploadNext(0);
  };

  const hasChanges = files[0] || files[1] || files[2];

  return (
    <div className="sheet-overlay">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel">
        <div className="sheet-header">
          <h3 className="sheet-title">編輯相片</h3>
          <button onClick={onClose} className="icon-btn" aria-label="關閉">
            <CloseIcon className="icon-md" />
          </button>
        </div>
        <div className="sheet-body">
          <div className="photo-grid" style={{ marginBottom: 16 }}>
            {[0, 1, 2].map((idx) => {
              const src = previews[idx] || photos[idx];
              return (
                <label key={idx} className={"photo-slot" + (src ? " filled" : "")}>
                  {src ? (
                    <img src={src} alt={`photo-${idx + 1}`} />
                  ) : (
                    <>
                      <span className="slot-icon">+</span>
                      <span className="slot-label">上傳</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="upload-input"
                    onChange={(e) => handleFile(idx, e)}
                  />
                </label>
              );
            })}
          </div>
        </div>
        <div className="sheet-footer">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="nav-btn primary"
            style={{ width: "100%" }}
          >
            {saving ? "上傳中⋯" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Who I Am ----------------
function WhoIAm({ profile, onProfileUpdated }) {
  const [editingCard, setEditingCard] = useState(null);
  const [editingPhotos, setEditingPhotos] = useState(false);
  const [editingBio, setEditingBio] = useState(false);

  const photos = [
    profile["my-photo-1"],
    profile["my-photo-2"],
    profile["my-photo-3"]
  ];

  const completeness = calculateCompleteness(profile);
  const { missing, percent } = completeness;

  const openSheet = (cardKey) => setEditingCard(cardKey);
  const closeSheet = () => setEditingCard(null);

  const orientationRaw = profile["sexual-orientation"] || "";
  const orientationValues = orientationRaw
    ? String(orientationRaw).split(/[,，]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const handleProfileUpdated = (newProfile) => {
    if (newProfile && typeof newProfile === "object" && newProfile.email && onProfileUpdated) {
      onProfileUpdated(newProfile);
    }
  };

  return (
    <div className="fade-in">

      {/* Completeness */}
      <div className="completeness-card">
        <div className="completeness-head">
          <span className="completeness-label">個人檔案完成度</span>
          <span className="completeness-percent">{percent}%</span>
        </div>
        <div className="completeness-bar">
          <div className="completeness-fill" style={{ width: percent + "%" }} />
        </div>
        {missing > 0 ? (
          <p className="completeness-hint">
            再填 <span style={{ fontWeight: 600, color: "var(--text)" }}>{missing}</span> 項提升配對機會
          </p>
        ) : (
          <p className="completeness-hint done">✨ 完美!你嘅檔案已經填齊曬</p>
        )}
      </div>

      {/* Photos */}
      <Card icon="📷" title="相片" onEdit={() => setEditingPhotos(true)}>
        <div className="photo-grid-2x3">
          <PhotoCell url={photos[0]} alt="photo-1" className="span-2x2" />
          <PhotoCell url={photos[1]} alt="photo-2" />
          <PhotoCell url={photos[2]} alt="photo-3" />
        </div>
      </Card>

      {/* Summary */}
      <div className="dash-card">
        <button
          onClick={() => openSheet("summary")}
          className="icon-btn card-edit-top"
          aria-label="編輯"
        >
          <PencilIcon className="icon-sm" />
        </button>

        <div className="flex items-center flex-wrap gap-sm" style={{ marginBottom: 4 }}>
          <h2 className="summary-name">
            {profile.name || <span style={{ color: "#ccc" }}>未填寫</span>}
          </h2>
          {profile.sex && <ProfileChip label={profile.sex} />}
          {orientationValues.map((v, i) => <ProfileChip key={i} label={v} />)}
        </div>

        <div className="summary-details">
          {profile["my-age"] && <div>🎂 {profile["my-age"]}</div>}
          {profile["my-height"] && <div>📏 {profile["my-height"]} cm</div>}
          {profile["my-occupation"] && <div>💼 {profile["my-occupation"]}</div>}
          {profile["my-uni"] && <div>🎓 {profile["my-uni"]}</div>}
        </div>
      </div>

      {/* Bio */}
      <Card icon="💬" title="自我介紹" onEdit={() => setEditingBio(true)}>
        <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {profile["my-bio"] || <span style={{ color: "#ccc" }}>未填寫</span>}
        </div>
      </Card>

      {/* About */}
      <Card
        icon="✨"
        title="讓人更了解你"
        helper="填得越多,我哋越容易幫你搵到適合的人"
        onEdit={() => openSheet("about")}
      >
        <Row label="想一齊做嘅活動" value={profile["my-activities"]} isChips />
        <Row label="興趣" value={profile["my-hobby"]} isChips />
      </Card>

      {/* Personality */}
      <Card icon="🧠" title="個性 & 相處" onEdit={() => openSheet("personality")}>
        <Row label="MBTI" value={profile["my-MBTI"]} />
        <Row label="愛的語言" value={profile["my-love-language"]} />
      </Card>

      {/* Lifestyle */}
      <Card icon="🌿" title="生活習慣" onEdit={() => openSheet("lifestyle")}>
        <Row label="飲酒習慣" value={profile["my-drinking-habbit"]} />
        <Row label="吸煙習慣" value={profile["my-smoking-habbit"]} />
      </Card>

      {/* Relationship */}
      <Card icon="💛" title="關係觀" onEdit={() => openSheet("relationship")}>
        <Row label="對小朋友的想法" value={profile["my-kids-expectation"]} />
        <Row label="宗教" value={profile["my-religion"]} />
      </Card>

      {/* Account */}
      <Card icon="⚙️" title="帳戶設定" onEdit={() => openSheet("account")}>
        <Row label="電郵" value={profile.email} />
        <Row label="Instagram" value={profile.instagram} />
        <Row label="電話" value={profile.phone} />
      </Card>

      {/* Standard BottomSheet */}
      {editingCard && (
        <BottomSheet
          open={true}
          title={PROFILE_CARD_CONFIGS[editingCard].title}
          fields={PROFILE_CARD_CONFIGS[editingCard].fields}
          profile={profile}
          onClose={closeSheet}
          onSaved={handleProfileUpdated}
        />
      )}

      {editingBio && (
        <BioEditSheet
          open={true}
          currentBio={profile["my-bio"]}
          onClose={() => setEditingBio(false)}
          onSaved={(newProfile) => { setEditingBio(false); handleProfileUpdated(newProfile); }}
        />
      )}

      {editingPhotos && (
        <PhotoEditSheet
          open={true}
          photos={photos}
          onClose={() => setEditingPhotos(false)}
          onSaved={() => { setEditingPhotos(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}

// ===================== dashboard/tab-want-cards.js =====================
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

// ===================== dashboard/push.js =====================
// ============================================================
// push.js — NotificationSettings control for the profile tab.
//
// Loaded as type="text/babel" BEFORE tab-profile.js so the component is
// defined when ProfileTab renders. Reuses the push helpers from lib.js
// (getPushState, enablePushNotifications, disablePushNotifications,
// hasPushSubscription) and the BellIcon.
// ============================================================

function NotificationSettings() {
  // 'unsupported' | 'ios-needs-install' | 'default' | 'granted' | 'denied'
  const [state, setState] = useState("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => {
    const s = getPushState();
    setState(s);
    if (s === "granted") {
      try {
        setSubscribed(await hasPushSubscription());
      } catch (e) {
        setSubscribed(false);
      }
    } else {
      setSubscribed(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    try {
      await enablePushNotifications();
      await refresh();
    } catch (e) {
      if (e.message === "denied") {
        setError("你已拒絕通知權限。請喺瀏覽器設定重新開啟。");
      } else if (e.message === "unsupported") {
        setError("此瀏覽器唔支援通知。");
      } else {
        setError("開啟通知失敗，請再試一次。");
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    try {
      await disablePushNotifications();
      await refresh();
    } catch (e) {
      setError("關閉通知失敗，請再試一次。");
    } finally {
      setBusy(false);
    }
  };

  // Unsupported (non-iOS): hide the control entirely.
  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="notif-card">
      <div className="notif-card-head">
        <BellIcon className="icon-sm" />
        <span>配對通知</span>
      </div>

      {state === "ios-needs-install" && (
        <p className="notif-hint">
          想喺手機收到配對結果通知？請先將本頁加入主畫面：㩒分享按鈕
          <span aria-hidden="true"> ⬆️ </span>
          →「加入主畫面 / Add to Home Screen」，再喺主畫面打開本 App 開啟通知。
        </p>
      )}

      {(state === "default" || (state === "granted" && !subscribed)) && (
        <>
          <p className="notif-hint">開啟後，有新配對結果或活動更新時我哋會即時通知你。</p>
          <button className="notif-btn" onClick={handleEnable} disabled={busy}>
            {busy ? "處理中…" : "開啟通知"}
          </button>
        </>
      )}

      {state === "granted" && subscribed && (
        <>
          <p className="notif-hint notif-hint--on">通知已開啟 ✓</p>
          <button
            className="notif-btn notif-btn--ghost"
            onClick={handleDisable}
            disabled={busy}
          >
            {busy ? "處理中…" : "關閉通知"}
          </button>
        </>
      )}

      {state === "denied" && (
        <p className="notif-hint">
          你已封鎖通知。如想收到配對通知，請喺瀏覽器設定重新允許本網站發送通知。
        </p>
      )}

      {error && <p className="notif-error">{error}</p>}
    </div>
  );
}

// ===================== dashboard/tab-profile.js =====================
// ============================================================
// tab-profile.js — Profile tab wrapper with sub-tab switcher
// ============================================================

function ProfileTab({ profile, subTab, setSubTab, onLogout, onProfileUpdated }) {
  // A logged-in member should always have a profile, but if the bootstrap returns
  // null/empty (e.g. a transient backend hiccup), render a friendly retry state
  // instead of throwing on profile[...] below — which would blank the whole app.
  if (!profile) {
    return (
      <div className="fade-in" style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🙈</div>
        <p style={{ fontSize: 15, color: "var(--text)", marginBottom: 8 }}>暫時載入唔到你嘅個人資料</p>
        <p style={{ fontSize: 13, color: "var(--text-light)", marginBottom: 20 }}>請試吓重新整理頁面</p>
        <button onClick={() => window.location.reload()} className="nav-btn primary" style={{ maxWidth: 200, margin: "0 auto" }}>重新整理</button>
      </div>
    );
  }
  const rawDealBreaker = profile["deal-breaker"];
  const dealBreakers = Array.isArray(rawDealBreaker)
    ? rawDealBreaker
    : String(rawDealBreaker || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="fade-in">
      <div className="subtab-switcher">
        <button
          onClick={() => { window.location.hash = "profile"; }}
          className={"subtab-btn" + (subTab === "me" ? " active" : "")}
        >
          關於我
        </button>
        <button
          onClick={() => { window.location.hash = "ideal"; }}
          className={"subtab-btn" + (subTab === "want" ? " active" : "")}
        >
          理想型
        </button>
      </div>

      {subTab === "me"
        ? <WhoIAm profile={profile} onProfileUpdated={onProfileUpdated} />
        : <WhatIWant profile={profile} dealBreakers={dealBreakers} onProfileUpdated={onProfileUpdated} />
      }

      <NotificationSettings />

      <button onClick={onLogout} className="logout-btn">
        <LogoutIcon className="icon-sm" />
        登出
      </button>
    </div>
  );
}

// ===================== dashboard/promo.js =====================
// ============================================================
// promo.js — discoverable top banner for enabling notifications and
// installing the dashboard ("Add to Home Screen"), plus a tabbed tutorial.
// Loaded as type="text/babel" BEFORE app.js. Reuses helpers + icons from lib.js
// (getPromoState, getInstallState, enablePushNotifications, triggerNativeInstall,
//  snoozePromo, BellIcon, ShareIcon, CloseIcon, isIos).
// ============================================================

// Tabbed how-to-install tutorial (iPhone / Android). Opened from the banner's
// 睇教學 CTA. Frames installing around the notification benefit.
function InstallTour({ onClose }) {
  const [tab, setTab] = useState(isIos() ? "iphone" : "android");
  const [installing, setInstalling] = useState(false);
  const canNative = !!window.deferredInstallPrompt;

  const doNative = async () => {
    setInstalling(true);
    try { await triggerNativeInstall(); } finally { setInstalling(false); onClose(); }
  };

  return (
    <div className="install-tour" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="install-tour__card" onClick={(e) => e.stopPropagation()}>
        <button className="install-tour__x" onClick={onClose} aria-label="關閉">
          <CloseIcon className="icon-sm" />
        </button>

        <div className="install-tour__title">新配對一到，即刻通知你 🔔</div>
        <p className="install-tour__lead">
          開啟通知之後，一有新配對我哋會即刻 send 俾你，唔使次次自己返嚟 check。
        </p>

        <div className="install-tabs" role="tablist">
          <button
            className={"install-tab" + (tab === "iphone" ? " active" : "")}
            onClick={() => setTab("iphone")}
          >
            iPhone
          </button>
          <button
            className={"install-tab" + (tab === "android" ? " active" : "")}
            onClick={() => setTab("android")}
          >
            Android
          </button>
        </div>

        {tab === "iphone" ? (
          <>
            <div className="install-warn">暫時剩係支援 Safari 🥺🥺</div>
            <ol className="install-tour__steps">
              <li>
                <span className="install-tour__num">1</span>
                <span>㩒右下角嘅 <b>⋯</b>（更多 / More）</span>
              </li>
              <li>
                <span className="install-tour__num">2</span>
                <span>揀 <b>分享 / Share</b> <ShareIcon className="install-tour__inline" /></span>
              </li>
              <li>
                <span className="install-tour__num">3</span>
                <span>向下捲，揀 <b>加入主畫面 / Add to Home Screen</b></span>
              </li>
              <li>
                <span className="install-tour__num">4</span>
                <span>㩒右上角 <b>加入 / Add</b></span>
              </li>
              <li>
                <span className="install-tour__num">5</span>
                <span>返主畫面打開「Link in HK」App，然後登入</span>
              </li>
              <li>
                <span className="install-tour__num">6</span>
                <span>㩒頂部「開啟」通知，再揀 <b>允許 / Allow</b></span>
              </li>
            </ol>
          </>
        ) : (
          <>
            {canNative && (
              <button className="notif-btn install-native-btn" onClick={doNative} disabled={installing}>
                {installing ? "…" : "立即安裝 / Install"}
              </button>
            )}
            <ol className="install-tour__steps">
              <li>
                <span className="install-tour__num">1</span>
                <span>㩒右上角嘅 <b>⋮</b>（選單 / Menu）</span>
              </li>
              <li>
                <span className="install-tour__num">2</span>
                <span>揀 <b>安裝應用程式 / Install app</b>（或 <b>加入主畫面 / Add to Home screen</b>）</span>
              </li>
              <li>
                <span className="install-tour__num">3</span>
                <span>㩒 <b>安裝 / Install</b> 確認</span>
              </li>
              <li>
                <span className="install-tour__num">4</span>
                <span>返主畫面打開「Link in HK」App，然後登入</span>
              </li>
              <li>
                <span className="install-tour__num">5</span>
                <span>㩒頂部「開啟」通知，再揀 <b>允許 / Allow</b></span>
              </li>
            </ol>
          </>
        )}

        <button className="notif-btn" onClick={onClose}>知道喇</button>
      </div>
    </div>
  );
}

function TopPromoBanner() {
  const [state, setState] = useState("none"); // 'notif' | 'install' | 'none'
  const [busy, setBusy] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [done, setDone] = useState(null);

  const refresh = () => setState(getPromoState());

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("promo-install-available", onChange);
    window.addEventListener("promo-installed", onChange);
    document.addEventListener("visibilitychange", onChange);
    return () => {
      window.removeEventListener("promo-install-available", onChange);
      window.removeEventListener("promo-installed", onChange);
      document.removeEventListener("visibilitychange", onChange);
    };
  }, []);

  // The success confirmation auto-dismisses; the prompts themselves do not.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 3000);
    return () => clearTimeout(t);
  }, [done]);

  const handleEnable = async () => {
    setBusy(true);
    try {
      await enablePushNotifications();
      setDone("通知已開啟 ✓");
    } catch (e) {
      // denied / unsupported — drop the banner; user can retry from Profile.
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const dismiss = () => {
    snoozePromo(state === "notif" ? "notif" : "install");
    setState("none");
  };

  if (done) {
    return (
      <div className="promo-banner promo-banner--ok">
        <BellIcon className="promo-banner__icon" />
        <span className="promo-banner__text">{done}</span>
      </div>
    );
  }

  if (state === "none") return null;

  const isNotif = state === "notif";

  return (
    <>
      <div className="promo-banner">
        <BellIcon className="promo-banner__icon" />
        <span className="promo-banner__text">開啟通知，唔好錯過任何一個配對</span>
        <button
          className="promo-banner__action"
          onClick={isNotif ? handleEnable : () => setShowTour(true)}
          disabled={busy}
        >
          {busy ? "…" : (isNotif ? "開啟" : "睇教學")}
        </button>
        <button className="promo-banner__close" onClick={dismiss} aria-label="關閉">
          <CloseIcon className="icon-sm" />
        </button>
      </div>

      {showTour && <InstallTour onClose={() => setShowTour(false)} />}
    </>
  );
}

// ===================== dashboard/app.js =====================
// ============================================================
// app.js — main Dashboard component, routing, header, bottom nav, mount
// ============================================================

// Persistent banner shown while an admin is viewing a member's dashboard.
function ImpersonationBanner() {
  if (!isImpersonating()) return null;
  const email = localStorage.getItem(IMP_FLAG);
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 2147483646,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "6px 12px",
        background: "#7c3aed",
        color: "#fff",
        font: "600 12px/1.4 system-ui,-apple-system,sans-serif",
        letterSpacing: "0.3px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.18)"
      }}
    >
      <span>
        👁 管理員模式 · 正以 <strong>{email && email !== "1" ? email : "會員"}</strong> 身分檢視
      </span>
      <button
        onClick={exitImpersonation}
        style={{
          flex: "0 0 auto",
          border: "1px solid rgba(255,255,255,0.7)",
          background: "rgba(255,255,255,0.12)",
          color: "#fff",
          borderRadius: 999,
          padding: "2px 12px",
          font: "600 12px system-ui,-apple-system,sans-serif",
          cursor: "pointer"
        }}
      >
        結束
      </button>
    </div>
  );
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("match");
  const [profileSubTab, setProfileSubTab] = useState("me");

  // ---------------- Hash routing ----------------
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "ideal") {
        setActiveTab("profile");
        setProfileSubTab("want");
      } else if (TAB_IDS.includes(hash)) {
        setActiveTab(hash);
        if (hash === "profile") setProfileSubTab("me");
      } else {
        setActiveTab("match");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // ---------------- Notification click → route to tab ----------------
  // The service worker postMessages the target URL when a notification is
  // clicked on an already-open tab; apply its hash so handleHash routes us.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event) => {
      if (event.data && event.data.type === "NOTIFICATION_NAVIGATE") {
        const hash = (event.data.url || "").split("#")[1] || "match";
        window.location.hash = hash;
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  // ---------------- Bootstrap fetch ----------------
  // Re-runnable: the dashboard data all comes from the get-dashboard-bootstrap
  // webhook, which re-reads the DB on every call. Pass { silent: true } to
  // refresh in the background after a mutation (e.g. responding to a match)
  // without flashing the full-screen loader or unmounting the tabs.
  const fetchBootstrap = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await authenticatedFetch(API.BOOTSTRAP, {
        method: "POST",
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile || null);
        setCurrentMatch(data.currentMatch || null);
        setHistory(data.history || []);
        setEvents(data.events || []);
      } else if (!silent) {
        setError(data.error || "載入失敗");
      }
    } catch (err) {
      if (err.message !== "Unauthorized" && err.message !== "No token") {
        console.error(err);
        if (!silent) setError("網絡連線錯誤");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBootstrap(); }, [fetchBootstrap]);

  const changeTab = (tabId) => { window.location.hash = tabId; };
  const handleLogout = () => { clearAuth(); redirectToLogin(); };

  if (loading) return (<><ImpersonationBanner /><LoadingScreen /></>);
  if (error) return (<><ImpersonationBanner /><ErrorScreen message={error} /></>);

  return (
    <div>
      <ImpersonationBanner />
      <div className="app-topbar">
        <TopPromoBanner />
        <header className="app-header">
          <div className="app-header-inner">
            <img src="/logo.png" alt="Link in HK" className="logo-img" />
            <div className="app-header-email">{profile?.email}</div>
          </div>
        </header>
      </div>

      <main className="app-main">
        {activeTab === "match" && (
          <MatchTab
            profile={profile}
            currentMatch={currentMatch}
            onMatchResponded={() => fetchBootstrap({ silent: true })}
          />
        )}
        {activeTab === "events" && <EventsTab profile={profile} events={events} />}
        {activeTab === "history" && <HistoryTab profile={profile} history={history} />}
        {activeTab === "profile" && (
          <ProfileTab
            profile={profile}
            subTab={profileSubTab}
            setSubTab={setProfileSubTab}
            onLogout={handleLogout}
            onProfileUpdated={(newProfile) => setProfile(newProfile)}
          />
        )}
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => changeTab(id)}
              className={"bottom-nav-btn" + (activeTab === id ? " active" : "")}
            >
              <Icon className="icon-lg" />
              <span className="bottom-nav-label">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Dashboard />);
