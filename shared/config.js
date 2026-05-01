// ============================================================
// config.js — environment detection and API base URLs
// Loaded before any other script that calls n8n webhooks.
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

  var N8N_BASES = {
    prod: "https://linkinhk.app.n8n.cloud/webhook",
    // TODO: replace with the UAT n8n instance/workspace base URL once provisioned.
    uat: "https://linkinhk.app.n8n.cloud/webhook-test",
  };

  window.LINKINHK_ENV = ENV;
  window.N8N_BASE = N8N_BASES[ENV];
})();
