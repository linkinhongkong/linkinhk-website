// ============================================================
// tab-profile.js — Profile tab wrapper with sub-tab switcher
// ============================================================

function ProfileTab({ profile, subTab, setSubTab, onLogout, onProfileUpdated }) {
  // deal-breaker can be a Multiple Select (array) or comma-separated string
  var rawDealBreaker = profile["deal-breaker"];
  var dealBreakers = Array.isArray(rawDealBreaker)
    ? rawDealBreaker
    : String(rawDealBreaker || "").split(",").map(function(s) { return s.trim(); }).filter(Boolean);

  return (
    <div className="fade-in">
      {/* Sub-tabs */}
      <div className="bg-white rounded-xl border border-stone-200 p-1 flex mb-4">
        <button
          onClick={function() { setSubTab("me"); }}
          className={"flex-1 py-2 text-sm font-medium rounded-lg transition " +
            (subTab === "me"
              ? "bg-stone-900 text-white"
              : "text-stone-500 hover:text-stone-900")}
        >
          我自己
        </button>
        <button
          onClick={function() { setSubTab("want"); }}
          className={"flex-1 py-2 text-sm font-medium rounded-lg transition " +
            (subTab === "want"
              ? "bg-stone-900 text-white"
              : "text-stone-500 hover:text-stone-900")}
        >
          我想要
        </button>
      </div>

      {subTab === "me"
        ? <WhoIAm profile={profile} onProfileUpdated={onProfileUpdated} />
        : <WhatIWant profile={profile} dealBreakers={dealBreakers} />
      }

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="w-full mt-6 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2"
      >
        <LogoutIcon className="w-4 h-4" />
        登出
      </button>
    </div>
  );
}
