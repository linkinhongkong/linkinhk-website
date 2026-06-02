// ============================================================
// promo.js — discoverable top banner for enabling notifications and
// installing the dashboard ("Add to Home Screen"), plus the iOS install tour.
// Loaded as type="text/babel" BEFORE app.js. Reuses helpers + icons from lib.js
// (getPromoState, getInstallState, enablePushNotifications, triggerNativeInstall,
//  snoozePromo, BellIcon, HomePlusIcon, ShareIcon, CloseIcon).
// ============================================================

// Full-screen guided overlay for iOS, where there is no install API.
function IosInstallTour({ inAppBrowser, onClose }) {
  return (
    <div className="install-tour" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="install-tour__card" onClick={(e) => e.stopPropagation()}>
        <button className="install-tour__x" onClick={onClose} aria-label="關閉">
          <CloseIcon className="icon-sm" />
        </button>
        <div className="install-tour__title">加入主畫面</div>

        {inAppBrowser ? (
          <p className="install-tour__lead">
            你而家係喺 App 內置瀏覽器打開，未必加到主畫面。請先用 <b>Safari</b> 開啟本頁
            （㩒右上角 <b>⋯</b> →「喺 Safari 開啟」），再跟以下步驟。
          </p>
        ) : (
          <p className="install-tour__lead">只需 3 步，就可以好似 App 咁喺主畫面一㩒即開：</p>
        )}

        <ol className="install-tour__steps">
          <li>
            <span className="install-tour__num">1</span>
            <span>㩒 Safari 底部嘅<b>分享</b>按鈕 <ShareIcon className="install-tour__inline" /></span>
          </li>
          <li>
            <span className="install-tour__num">2</span>
            <span>向下捲，揀<b>「加入主畫面」</b></span>
          </li>
          <li>
            <span className="install-tour__num">3</span>
            <span>㩒右上角<b>「加入」</b></span>
          </li>
        </ol>

        <button className="notif-btn" onClick={onClose}>知道喇</button>
      </div>

      {!inAppBrowser && <div className="install-tour__arrow" aria-hidden="true">⬇️</div>}
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

  const handleInstall = async () => {
    if (getInstallState() === "native") {
      setBusy(true);
      try { await triggerNativeInstall(); } finally { setBusy(false); refresh(); }
    } else {
      setShowTour(true); // ios-safari / ios-other
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
  const inst = getInstallState();

  return (
    <>
      <div className="promo-banner">
        {isNotif
          ? <BellIcon className="promo-banner__icon" />
          : <HomePlusIcon className="promo-banner__icon" />}
        <span className="promo-banner__text">
          {isNotif
            ? "開啟通知，第一時間知道配對結果"
            : "加入主畫面，好似 App 咁一㩒即開"}
        </span>
        <button
          className="promo-banner__action"
          onClick={isNotif ? handleEnable : handleInstall}
          disabled={busy}
        >
          {busy ? "…" : (isNotif ? "開啟" : "加入")}
        </button>
        <button className="promo-banner__close" onClick={dismiss} aria-label="關閉">
          <CloseIcon className="icon-sm" />
        </button>
      </div>

      {showTour && (
        <IosInstallTour
          inAppBrowser={inst === "ios-other"}
          onClose={() => setShowTour(false)}
        />
      )}
    </>
  );
}
