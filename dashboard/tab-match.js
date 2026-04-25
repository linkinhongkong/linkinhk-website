// ============================================================
// tab-match.js — the Match tab (default landing tab)
// ============================================================

function ageFromDOB(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const mo = now.getMonth() - d.getMonth();
  if (mo < 0 || (mo === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

function zodiacFromDOB(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const signs = [
    { name: "山羊座", emoji: "♑", from: [12, 22], to: [1, 19] },
    { name: "水瓶座", emoji: "♒", from: [1, 20], to: [2, 18] },
    { name: "雙魚座", emoji: "♓", from: [2, 19], to: [3, 20] },
    { name: "白羊座", emoji: "♈", from: [3, 21], to: [4, 19] },
    { name: "金牛座", emoji: "♉", from: [4, 20], to: [5, 20] },
    { name: "雙子座", emoji: "♊", from: [5, 21], to: [6, 20] },
    { name: "巨蟹座", emoji: "♋", from: [6, 21], to: [7, 22] },
    { name: "獅子座", emoji: "♌", from: [7, 23], to: [8, 22] },
    { name: "處女座", emoji: "♍", from: [8, 23], to: [9, 22] },
    { name: "天秤座", emoji: "♎", from: [9, 23], to: [10, 22] },
    { name: "天蝍座", emoji: "♏", from: [10, 23], to: [11, 21] },
    { name: "射手座", emoji: "♐", from: [11, 22], to: [12, 21] },
  ];
  for (const s of signs) {
    const [fm, fd] = s.from;
    const [tm, td] = s.to;
    if (fm === tm) {
      if (m === fm && day >= fd && day <= td) return s;
    } else {
      if ((m === fm && day >= fd) || (m === tm && day <= td)) return s;
    }
  }
  return null;
}

// ---------------- Info chips ----------------
function MatchInfoChip({ children }) {
  return <span className="info-chip">{children}</span>;
}

function InfoChipsRow({ partner }) {
  const age = ageFromDOB(partner["my-age"]);
  const zodiac = zodiacFromDOB(partner["my-age"]);
  const chips = [];
  if (age != null) chips.push(<MatchInfoChip key="age">🎂 {age}歲</MatchInfoChip>);
  if (partner["my-height"]) chips.push(<MatchInfoChip key="h">📏 {partner["my-height"]}cm</MatchInfoChip>);
  if (partner["my-occupation"]) chips.push(<MatchInfoChip key="occ">{partner["my-occupation"]}</MatchInfoChip>);
  if (partner["my-uni"]) chips.push(<MatchInfoChip key="uni">🎓 {partner["my-uni"]}</MatchInfoChip>);
  if (zodiac) chips.push(<MatchInfoChip key="z">{zodiac.emoji} {zodiac.name}</MatchInfoChip>);
  if (partner["my-MBTI"]) chips.push(<MatchInfoChip key="mbti">{partner["my-MBTI"]}</MatchInfoChip>);
  if (partner["my-religion"]) chips.push(<MatchInfoChip key="r">⛪ {partner["my-religion"]}</MatchInfoChip>);
  if (chips.length === 0) return null;
  return <div className="flex flex-wrap gap-sm mb-lg">{chips}</div>;
}

// ---------------- Compatibility banner ----------------
function CompatibilityBanner({ score }) {
  return (
    <div className="compat-banner">
      <div className="compat-banner-sub">你哋互相選擇對方為理想型 ✨</div>
      <div className="compat-banner-score">匹配度 {score}%</div>
    </div>
  );
}

// ---------------- Countdown card ----------------
function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function CountdownCard({ deadline }) {
  const target = deadline ? new Date(deadline).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || isNaN(target)) return null;

  const remaining = target - now;
  const expired = remaining <= 0;

  return (
    <div className={"countdown-card" + (expired ? " expired" : "")}>
      <div className="countdown-card-label">⏰ 倒數限時回覆</div>
      <div className="countdown-card-time">{formatCountdown(remaining)}</div>
      <div className="countdown-card-hint">
        {expired ? "已過期" : "把握機會,過時不候"}
      </div>
    </div>
  );
}

// ---------------- Membership gate ----------------
function MembershipGate() {
  const [copied, setCopied] = useState(false);
  const phone = "991878330";

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(phone);
      } else {
        const ta = document.createElement("textarea");
        ta.value = phone;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <div className="membership-gate">
      <div className="membership-gate-header">
        <div className="membership-gate-emoji">💌</div>
        <div className="membership-gate-title">仲未係會員</div>
        <div className="membership-gate-sub">
          完成以下兩個簡單步驟,即可開始收到每週配對 ✨
        </div>
      </div>

      <div className="membership-step">
        <div className="membership-step-title">
          <span className="membership-step-num">1</span>
          用 PayMe / FPS 入會
        </div>
        <div className="membership-step-body">
          <p>請透過 PayMe 或 FPS 轉數至以下號碼:</p>
          <div className="membership-pay-row">
            <span className="membership-pay-number">{phone}</span>
            <button
              type="button"
              onClick={handleCopy}
              className={"membership-copy-btn" + (copied ? " copied" : "")}
            >
              {copied ? "已複製 ✓" : "複製"}
            </button>
          </div>
        </div>
      </div>

      <div className="membership-step">
        <div className="membership-step-title">
          <span className="membership-step-num">2</span>
          IG DM 我哋確認
        </div>
        <div className="membership-step-body">
          <p>
            完成付款後,請於 Instagram DM 我哋:
            {" "}
            <a
              href="https://instagram.com/linkinhk"
              target="_blank"
              rel="noopener noreferrer"
              className="membership-ig"
            >
              @linkinhk
            </a>
          </p>
          <p>我哋會盡快幫你開通會員 💚</p>
        </div>
      </div>
    </div>
  );
}

// ---------------- Bio card ----------------
function BioCard({ bio }) {
  if (!bio || String(bio).trim() === "") return null;
  return (
    <div className="bio-card fade-in">
      <div className="bio-card-label">關於佢</div>
      <p className="bio-card-text">{bio}</p>
    </div>
  );
}

// ---------------- Toast ----------------
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, []);
  return <div className="toast-neutral">{message}</div>;
}

// ---------------- Action buttons ----------------
function ActionButtons({ onAccept, onReject, disabled }) {
  return (
    <div className="match-actions fade-in">
      <button onClick={onReject} disabled={disabled} className="btn-pill secondary">
        無興趣
      </button>
      <button onClick={onAccept} disabled={disabled} className="btn-pill primary">
        想認識 💚
      </button>
    </div>
  );
}

// ---------------- Empty state ----------------
function NoMatchState() {
  return (
    <div className="flex flex-col items-center justify-center fade-in" style={{ padding: "80px 0" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💌</div>
      <p style={{ color: "var(--text)", fontWeight: 500, marginBottom: 4 }}>今個禮拜暫時未有配對</p>
      <p style={{ color: "var(--text-light)", fontSize: 14, textAlign: "center", maxWidth: 300 }}>
        我哋每星期二夜晚送出新嘅配對結果,記得返嘅睬睬 ✨
      </p>
    </div>
  );
}

// ---------------- Main Match tab ----------------
function MatchTab({ profile, currentMatch, onMatchResponded }) {
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [responded, setResponded] = useState(false);

  const handleResponse = async (response) => {
    if (submitting || !currentMatch) return;
    setSubmitting(true);
    try {
      const res = await authenticatedFetch(API.RESPOND_TO_MATCH, {
        method: "POST",
        body: JSON.stringify({
          response,
          side: currentMatch.mySide,
          partnerEmail: currentMatch.partnerProfile.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(response === "accept" ? "已回覆: 想認識 💚" : "已回覆: 無興趣");
        setResponded(true);
        if (onMatchResponded) onMatchResponded();
      } else {
        setToast(data.error || "出錯,請再試");
        setSubmitting(false);
      }
    } catch (err) {
      if (err.message !== "Unauthorized" && err.message !== "No token") {
        setToast("網絡連線錯誤");
      }
      setSubmitting(false);
    }
  };

  const membership = String((profile && profile.membership) || "").toLowerCase();
  if (membership !== "activated") {
    return <MembershipGate />;
  }

  if (responded || !currentMatch || !currentMatch.partnerProfile) {
    return (
      <>
        <NoMatchState />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </>
    );
  }

  const partner = currentMatch.partnerProfile;
  const photos = [partner["my-photo-1"], partner["my-photo-2"], partner["my-photo-3"]];
  const deadline = currentMatch.deadlineAt;

  return (
    <div className="fade-in" style={{ paddingBottom: 16 }}>
      <CompatibilityBanner score={currentMatch.compatibilityScore} />

      {deadline && <CountdownCard deadline={deadline} />}

      <div style={{ marginBottom: 16 }}>
        <PhotoCarousel photos={photos} />
      </div>

      <Card>
        {partner.name && (
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
            {partner.name}
          </h2>
        )}
        <InfoChipsRow partner={partner} />
        {partner["my-bio"] && String(partner["my-bio"]).trim() !== "" && (
          <div style={{ marginBottom: 16 }}>
            <div className="bio-card-label">關於佢</div>
            <p className="bio-card-text">{partner["my-bio"]}</p>
          </div>
        )}
        <ActionButtons
          onAccept={() => handleResponse("accept")}
          onReject={() => handleResponse("reject")}
          disabled={submitting}
        />
      </Card>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
