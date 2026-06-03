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
                <span>返主畫面打開「Link in HK」App，然後登入 / Open it from the Home Screen, then log in</span>
              </li>
              <li>
                <span className="install-tour__num">6</span>
                <span>喺 App 內㩒頂部「開啟」通知，再揀 <b>允許 / Allow</b></span>
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
                <span>返主畫面打開「Link in HK」App，然後登入 / Open it from the Home Screen, then log in</span>
              </li>
              <li>
                <span className="install-tour__num">5</span>
                <span>喺 App 內㩒頂部「開啟」通知，再揀 <b>允許 / Allow</b></span>
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
