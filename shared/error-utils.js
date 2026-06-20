// ============================================================
// error-utils.js — turn a failed network request into a precise,
// user-facing message + a compact diagnostic line for screenshots.
// Loaded as a regular <script> (like config.js) so window.describeError
// is available to both the bundled React pages and the vanilla admin.
//
// Usage:
//   const info = window.describeError(resOrError, { action, endpoint, sizeBytes });
//   // info = { message, detail, reportable }
//   //   message    — friendly Cantonese text to show the user
//   //   detail     — compact "endpoint · HTTP 413 · 47MB · 16:08" for screencaps
//   //   reportable — true => show the "IG DM us" link (server/network faults);
//   //                false => user can fix it themselves (rate limit, etc.)
// ============================================================
(function () {
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function nowHM() {
    var d = new Date();
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function toMB(bytes) {
    if (typeof bytes !== "number" || !isFinite(bytes)) return null;
    var m = bytes / (1024 * 1024);
    return (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10) + "MB";
  }

  window.describeError = function (failure, ctx) {
    ctx = ctx || {};
    var action = ctx.action || "操作";
    var endpoint = ctx.endpoint || "";

    var status = null;
    var errName = null;
    var reportable = true;
    var message;

    // A fetch Response (non-ok) has a numeric .status and an .ok flag;
    // a thrown error (network / timeout) does not.
    var isResponse =
      failure && typeof failure === "object" &&
      typeof failure.status === "number" && "ok" in failure;

    if (isResponse) {
      status = failure.status;
      if (status === 413) {
        message = "相片或檔案太大，請用細啲嘅相再試 🙏";
      } else if (status === 429) {
        message = "太多人同時使用，請稍等再試 🙏";
        reportable = false;
      } else if (status === 401 || status === 403) {
        message = "登入已過期，請重新登入";
      } else if (status === 404) {
        message = "暫時連接唔到服務，請稍後再試 🙏";
      } else if (status >= 500) {
        message = "伺服器繁忙，請稍後再試 🙏";
      } else {
        message = action + "失敗，請稍後再試 🙏";
      }
    } else if (failure) {
      errName = failure.name || "Error";
      if (errName === "AbortError") {
        message = action + "超時，請檢查網絡後再試 🙏";
      } else if (errName === "TypeError") {
        message = "網絡連線問題，請檢查網絡後再試 🙏";
      } else {
        message = action + "失敗，請檢查網絡後再試 🙏";
      }
    } else {
      message = action + "失敗，請稍後再試 🙏";
    }

    // Compact diagnostic line: endpoint · HTTP 413 / AbortError · 47MB · 16:08
    var parts = [];
    if (endpoint) parts.push(endpoint);
    if (status != null) parts.push("HTTP " + status);
    else if (errName) parts.push(errName);
    var size = toMB(ctx.sizeBytes);
    if (size) parts.push(size);
    parts.push(nowHM());

    return { message: message, detail: parts.join(" · "), reportable: reportable };
  };
})();
