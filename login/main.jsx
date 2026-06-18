import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";

    const REQUEST_OTP_URL = window.webhookUrl("request-otp");
    const VERIFY_OTP_URL = window.webhookUrl("verify-otp");

    function ErrorReportLink() {
      return (
        <div className="error-report-link">
          問題持續?描述一下情況同附上截圖,{" "}
          <a href="https://ig.me/m/linkinhk" target="_blank" rel="noopener noreferrer">
            傳到我哋 IG DM →
          </a>
          <br />我哋會盡快回覆 💜
        </div>
      );
    }

    function LoginPage() {
      // screens: "checking" | "email" | "code" | "loggedIn"
      const [screen, setScreen] = useState("checking");

      const [email, setEmail] = useState("");
      const [code, setCode] = useState("");

      // status: "idle" | "loading" | "error"
      const [status, setStatus] = useState("idle");
      const [errorMsg, setErrorMsg] = useState("");
      // errorReportable: true when the error is server/network-side (user can't
      // fix it themselves) — shows the IG DM report link. False for validation.
      const [errorReportable, setErrorReportable] = useState(false);

      const [loggedInEmail, setLoggedInEmail] = useState("");

      const codeInputRef = useRef(null);

      useEffect(() => {
        if (screen === "code" && codeInputRef.current) {
          setTimeout(() => codeInputRef.current.focus(), 100);
        }
      }, [screen]);

      // Same-origin redirect target from ?redirect=... — must start with a
      // single "/" to prevent open-redirect to external hosts.
      const getRedirectTarget = () => {
        const raw = new URLSearchParams(window.location.search).get("redirect");
        if (!raw) return "/dashboard";
        if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
        return "/dashboard";
      };

      // Optimistic redirect on page load: if a token exists, trust it and
      // go to dashboard. Dashboard bootstrap will bounce back here if invalid.
      useEffect(() => {
        const savedToken = localStorage.getItem("linkinhk_token");
        if (savedToken) {
          window.location.href = getRedirectTarget();
          return;
        }
        setScreen("email");
      }, []);

      const handleEmailSubmit = async () => {
        if (!email.trim()) {
          setErrorMsg("請輸入電郵地址");
          setErrorReportable(false);
          setStatus("error");
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          setErrorMsg("電郵格式不正確");
          setErrorReportable(false);
          setStatus("error");
          return;
        }

        setStatus("loading");
        setErrorMsg("");
        setErrorReportable(false);

        try {
          const res = await fetch(REQUEST_OTP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase() })
          });

          const data = await res.json();

          if (res.status === 429) {
            setErrorMsg(data.error || "請稍候再試");
            setErrorReportable(false);
            setStatus("error");
            return;
          }

          if (data.success) {
            setStatus("idle");
            setScreen("code");
          } else {
            setErrorMsg(data.error || "發生錯誤,請稍後再試");
            setErrorReportable(true);
            setStatus("error");
          }
        } catch (err) {
          setErrorMsg("網絡連線錯誤,請稍後再試");
          setErrorReportable(true);
          setStatus("error");
        }
      };

      const handleCodeSubmit = async () => {
        if (code.length !== 6) {
          setErrorMsg("請輸入 6 位數字驗證碼");
          setErrorReportable(false);
          setStatus("error");
          return;
        }

        setStatus("loading");
        setErrorMsg("");
        setErrorReportable(false);

        try {
          const res = await fetch(VERIFY_OTP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              code: code.trim()
            })
          });

          const data = await res.json();

          if (data.success && data.token) {
            localStorage.setItem("linkinhk_token", data.token);
            localStorage.setItem("linkinhk_email", data.email);
            window.location.href = getRedirectTarget();
            return;
          } else {
            // Wrong-code from user is NOT reportable; other server-side
            // failures (e.g. expired session, server bug) are.
            const isWrongCode = data.error && /驗證碼|錯誤|過期|invalid|expired/i.test(data.error);
            setErrorMsg(data.error || "驗證失敗,請再試");
            setErrorReportable(!isWrongCode);
            setStatus("error");
            setCode("");
            setTimeout(() => codeInputRef.current?.focus(), 100);
          }
        } catch (err) {
          setErrorMsg("網絡連線錯誤,請稍後再試");
          setErrorReportable(true);
          setStatus("error");
        }
      };

      const handleResend = async () => {
        setStatus("loading");
        setErrorMsg("");
        setErrorReportable(false);
        setCode("");

        try {
          const res = await fetch(REQUEST_OTP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase() })
          });

          const data = await res.json();

          if (res.status === 429) {
            setErrorMsg(data.error || "請稍候再試");
            setErrorReportable(false);
            setStatus("error");
            return;
          }

          setStatus("idle");
          setErrorMsg("");
        } catch (err) {
          setErrorMsg("網絡連線錯誤");
          setErrorReportable(true);
          setStatus("error");
        }
      };

      const handleLogout = () => {
        localStorage.removeItem("linkinhk_token");
        localStorage.removeItem("linkinhk_email");
        setLoggedInEmail("");
        setEmail("");
        setCode("");
        setScreen("email");
        setStatus("idle");
        setErrorMsg("");
      };

      const handleBackToEmail = () => {
        setCode("");
        setStatus("idle");
        setErrorMsg("");
        setScreen("email");
      };

      const handleEmailKeyDown = (e) => {
        if (e.key === "Enter" && status !== "loading") handleEmailSubmit();
      };

      const handleCodeKeyDown = (e) => {
        if (e.key === "Enter" && status !== "loading") handleCodeSubmit();
      };

      const handleCodeChange = (e) => {
        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
        setCode(val);
        if (status === "error") {
          setStatus("idle");
          setErrorMsg("");
        }
      };

      return (
        <div className="form-root">
          <div style={{ width: "100%", maxWidth: 480 }}>
            <div className="page-card">

              {/* ---------- CHECKING ---------- */}
              {screen === "checking" && (
                <div className="check-screen fade-in">
                  <div className="spinner" style={{ margin: "0 auto 16px" }} />
                  <p style={{ fontSize: 14, color: "var(--text-light)" }}>檢查登入狀態中...</p>
                </div>
              )}

              {/* ---------- EMAIL ---------- */}
              {screen === "email" && (
                <div className="fade-in" key="email">
                  <div className="login-header">
                    <img src="/logo.png" alt="Link in HK" className="login-logo" />
                    <div className="login-title">會員登入</div>
                    <div className="login-subtitle">
                      輸入你的電郵,我哋會寄一個驗證碼俾你 ✉️
                    </div>
                  </div>

                  <div className="login-body">
                    <div className="field" style={{ marginBottom: 16 }}>
                      <label className="field-label">電郵地址</label>
                      <input
                        type="email"
                        className="text-input"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status === "error") setStatus("idle");
                        }}
                        onKeyDown={handleEmailKeyDown}
                        placeholder="you@example.com"
                        disabled={status === "loading"}
                      />
                    </div>

                    {status === "error" && (
                      <div className="error-box fade-in">
                        {errorMsg}
                        {errorReportable && <ErrorReportLink />}
                      </div>
                    )}
                  </div>

                  <div className="login-nav-row">
                    <button
                      onClick={handleEmailSubmit}
                      disabled={status === "loading"}
                      className="nav-btn primary"
                      style={{ width: "100%" }}
                    >
                      {status === "loading" ? "傳送緊..." : "傳送驗證碼 ✨"}
                    </button>
                  </div>

                  <div className="login-footer">
                    <div className="login-footer-text">
                      仲未係會員?{" "}
                      <a href="https://www.linkinhk.com/join">即刻登記 💜</a>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- CODE ---------- */}
              {screen === "code" && (
                <div className="fade-in" key="code">
                  <div className="login-header">
                    <div className="otp-icon">📬</div>
                    <div className="login-title">輸入驗證碼</div>
                    <div className="login-subtitle">
                      我哋已經寄咗 6 位數字驗證碼去<br/>
                      <span className="login-subtitle-strong">{email}</span>
                    </div>
                  </div>

                  <div className="login-body">
                    <div className="field" style={{ marginBottom: 16 }}>
                      <input
                        ref={codeInputRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="text-input code-input"
                        value={code}
                        onChange={handleCodeChange}
                        onKeyDown={handleCodeKeyDown}
                        placeholder="000000"
                        disabled={status === "loading"}
                      />
                    </div>

                    {status === "error" && (
                      <div className="error-box fade-in">
                        {errorMsg}
                        {errorReportable && <ErrorReportLink />}
                      </div>
                    )}

                    <div className="login-meta">
                      <button onClick={handleBackToEmail} className="login-link">
                        ← 返回
                      </button>
                      <button
                        onClick={handleResend}
                        disabled={status === "loading"}
                        className="login-link underline"
                      >
                        重新傳送驗證碼
                      </button>
                    </div>
                  </div>

                  <div className="login-nav-row">
                    <button
                      onClick={handleCodeSubmit}
                      disabled={status === "loading" || code.length !== 6}
                      className="nav-btn primary"
                      style={{ width: "100%" }}
                    >
                      {status === "loading" ? "驗證緊..." : "登入 💜"}
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- LOGGED IN ---------- */}
              {screen === "loggedIn" && (
                <div className="fade-in" key="loggedIn">
                  <div className="success-screen">
                    <div className="success-icon">✓</div>
                    <div className="success-title">登入成功!</div>
                    <div className="success-subtitle">
                      歡迎返嚟,<br/>
                      <span className="login-subtitle-strong">{loggedInEmail}</span>
                    </div>
                  </div>

                  <div className="login-body">
                    <div className="debug-box">
                      <div className="debug-box-label">Session token (debug):</div>
                      <div className="debug-box-value">
                        {localStorage.getItem("linkinhk_token")?.slice(0, 32)}...
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-light)", textAlign: "center" }}>
                      會員專區仲未起好,呢度只係測試登入成功 ✨
                    </p>
                  </div>

                  <div className="login-nav-row">
                    <button
                      onClick={handleLogout}
                      className="nav-btn secondary"
                      style={{ width: "100%" }}
                    >
                      登出
                    </button>
                  </div>
                </div>
              )}

            </div>

            <div className="site-footer">Link in HK · linkinhk.com</div>
          </div>
        </div>
      );
    }

createRoot(document.getElementById("root")).render(<LoginPage />);
