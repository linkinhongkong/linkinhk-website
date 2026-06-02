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
