// ============================================================
// form-options.js — OPTIONS.* lists derived from shared-options.js,
// in the "icon+label" stored-value format used by the dashboard and
// ideal-form.
//
// Storage convention: options are stored in DB as "icon+label"
// (e.g. "🏦金融／銀行") to match what the signup form writes.
//
// Lives in /shared/. Loaded by:
//   - /dashboard/index.html   (after shared-options.js)
//   - /ideal-form/index.html  (after shared-options.js, before ideal-fields.js)
// Also used by /shared/components.js (optionToStored / optionsToCSV /
// findOptionsFromCSV) and /shared/ideal-fields.js (references OPTIONS.*).
//
// Requires: shared-options.js loaded before this file.
// ============================================================

// ---------------- Helper: convert shared format to dashboard format ----------------
// Shared format: { id, icon, label }  →  Dashboard format: { icon, label }
function _toDashOpt(shared) {
  return { icon: shared.icon || "", label: shared.label || "" };
}
function _toDashGroup(sharedGroup) {
  var result = {};
  var keys = Object.keys(sharedGroup);
  for (var i = 0; i < keys.length; i++) {
    result[keys[i]] = sharedGroup[keys[i]].map(_toDashOpt);
  }
  return result;
}

// ---------------- Single-select options ----------------
var OPTIONS = {
  sex: [
    { icon: "👨", label: "男性" },
    { icon: "👩", label: "女性" },
  ],
  occupation: SHARED_OCCUPATIONS.map(_toDashOpt),
  university: SHARED_UNIVERSITIES.map(_toDashOpt),
  religion: SHARED_RELIGIONS.map(_toDashOpt),
  mbti: SHARED_MBTI_TYPES.map(function(t) {
    return { icon: SHARED_MBTI_COLORS[t] || "", label: t };
  }).concat([{ icon: "", label: "不清楚" }]),
  loveLanguage: SHARED_LOVE_LANGUAGES.map(function(ll) {
    return { icon: "", label: ll.label + " (" + ll.en + ")" };
  }),
  drinking: SHARED_DRINKING.map(_toDashOpt),
  smoking: SHARED_SMOKING.map(_toDashOpt),
  kids: SHARED_KIDS.map(_toDashOpt),
};

// ---------------- Multi-select: hobbies (grouped) ----------------
var HOBBY_GROUPS = _toDashGroup(SHARED_INTERESTS);

// ---------------- Multi-select: activities (grouped, with Other) ----------------
var ACTIVITY_GROUPS = _toDashGroup(SHARED_ACTIVITIES);

// ---------------- Helpers ----------------

// Convert an option { icon, label } to the string stored in the DB.
// Signup form concatenates without a space: "🏦" + "金融／銀行" = "🏦金融／銀行"
function optionToStored(opt) {
  return (opt.icon || "") + (opt.label || "");
}

// Given a stored string from DB and an options array, find matching option.
function findOption(storedValue, options) {
  if (!storedValue) return null;
  var normalized = String(storedValue).trim();
  return options.find(function(opt) { return optionToStored(opt) === normalized; }) || null;
}

// For multi-select fields stored as comma-separated strings in DB
function findOptionsFromCSV(storedValue, flatOptions) {
  if (!storedValue) return [];
  var parts = String(storedValue).split(",").map(function(s) { return s.trim(); }).filter(Boolean);
  return parts
    .map(function(part) { return flatOptions.find(function(opt) { return optionToStored(opt) === part; }); })
    .filter(Boolean);
}

// Convert an array of option objects back to a CSV string for DB storage.
function optionsToCSV(optionsArray) {
  return optionsArray.map(optionToStored).join(", ");
}

// Flatten grouped options into a single array
function flattenGroups(groups) {
  return Object.values(groups).flat();
}

var ALL_HOBBIES = flattenGroups(HOBBY_GROUPS);
var ALL_ACTIVITIES = flattenGroups(ACTIVITY_GROUPS);
