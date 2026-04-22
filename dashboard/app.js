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

  // ---------------- Bootstrap fetch on load ----------------
  useEffect(() => {
    const fetchBootstrap = async () => {
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
        } else {
          setError(data.error || "載入失敗");
        }
      } catch (err) {
        if (err.message !== "Unauthorized" && err.message !== "No token") {
          console.error(err);
          setError("網絡連線錯誤");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBootstrap();
  }, []);

  const changeTab = (tabId) => { window.location.hash = tabId; };
  const handleLogout = () => { clearAuth(); redirectToLogin(); };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <div>
      <header className="app-header">
        <div className="app-header-inner">
          <img src="/logo.png" alt="Link in HK" className="logo-img" />
          <div className="app-header-email">{profile?.email}</div>
        </div>
      </header>

      <main className="app-main">
        {activeTab === "match" && (
          <MatchTab
            profile={profile}
            currentMatch={currentMatch}
            onMatchResponded={() => setCurrentMatch(null)}
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
