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

// ---------------- Tab metadata ----------------
const TABS = [
  { id: "match", label: "配對", Icon: HeartIcon },
  { id: "events", label: "活動", Icon: CalendarIcon },
  { id: "history", label: "紀錄", Icon: HistoryIcon },
  { id: "profile", label: "我", Icon: UserIcon },
];
