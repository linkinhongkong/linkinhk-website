// ============================================================
// lib.js — shared utilities, constants, API helpers, icons
// ============================================================

const { useState, useEffect } = React;

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
