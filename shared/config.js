// ============================================================
// config.js — environment detection, webhook URL builder, UAT banner.
// Loaded as a regular <script> before any code that calls n8n,
// so window.webhookUrl is defined before babel-transformed
// scripts (lib.js, components.js, etc.) execute.
// ============================================================
(function () {
  var host = (typeof location !== "undefined" && location.hostname) || "";

  // UAT hosts: any subdomain starting with "uat.", any *.pages.dev preview,
  // and localhost / 127.0.0.1 for local development.
  var isUat =
    host.indexOf("uat.") === 0 ||
    host.indexOf(".uat.") !== -1 ||
    host.indexOf("pages.dev") !== -1 ||
    host === "localhost" ||
    host === "127.0.0.1";

  var ENV = isUat ? "uat" : "prod";

  // Single n8n project hosts both environments; UAT workflows live alongside
  // prod and are distinguished by a "uat-" prefix on the webhook path.
  var N8N_BASE = "https://linkinhk.app.n8n.cloud/webhook";
  var PATH_PREFIX = ENV === "uat" ? "uat-" : "";

  window.LINKINHK_ENV = ENV;
  window.N8N_BASE = N8N_BASE;
  window.webhookUrl = function (name) {
    return N8N_BASE + "/" + PATH_PREFIX + name;
  };

  // -------- UAT banner: visible on every UAT page so it's impossible to
  // mistake for prod. No-op on prod. --------
  if (ENV !== "uat") return;

  function injectBanner() {
    if (!document.body || document.getElementById("linkinhk-uat-banner")) return;
    var banner = document.createElement("div");
    banner.id = "linkinhk-uat-banner";
    banner.textContent = "UAT ENVIRONMENT — TEST DATA ONLY";
    banner.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:2147483647",
      "height:24px",
      "line-height:24px",
      "background:#ffd54f",
      "color:#5d4037",
      "font:700 12px/24px system-ui,-apple-system,sans-serif",
      "letter-spacing:0.6px",
      "text-align:center",
      "border-bottom:2px solid #f9a825",
      "box-shadow:0 2px 4px rgba(0,0,0,0.12)",
      "pointer-events:none"
    ].join(";");
    document.body.appendChild(banner);
    // Push page content below the banner without breaking per-page layouts.
    var current = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
    document.body.style.paddingTop = current + 26 + "px";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectBanner);
  } else {
    injectBanner();
  }
})();
