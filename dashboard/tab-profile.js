// ============================================================
// tab-profile.js — Profile tab wrapper with sub-tab switcher
// ============================================================

function ProfileTab({ profile, subTab, setSubTab, onLogout, onProfileUpdated }) {
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

      <button onClick={onLogout} className="logout-btn">
        <LogoutIcon className="icon-sm" />
        登出
      </button>
    </div>
  );
}
