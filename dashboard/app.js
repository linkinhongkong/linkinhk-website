// ============================================================
// app.js — main Dashboard component, routing, header, bottom nav, mount
// ============================================================

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

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <div>
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

ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />);
