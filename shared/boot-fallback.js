// ============================================================
// boot-fallback.js — graceful fallback for the React/Babel pages.
//
// /login and /dashboard render entirely client-side: the browser must
// download React + @babel/standalone and compile the in-page JSX before
// anything appears in <div id="root">. If any of that fails (CDN down,
// an incompatible Babel version, or the app code throwing), #root stays
// empty and the visitor sees a silent white screen.
//
// This is plain JS loaded BEFORE the CDN scripts (NOT type="text/babel"),
// so it still runs even when Babel never loads. It watches for load/compile
// errors and, as a safety net, checks after page load whether the app ever
// rendered. If #root is still empty, it shows a friendly, refreshable
// message instead of a blank page.
// ============================================================
(function () {
  var shown = false;

  function showFallback() {
    if (shown) return;
    var root = document.getElementById("root");
    // Root not parsed yet, or the app rendered fine — leave it alone.
    if (!root || root.childElementCount > 0) return;
    shown = true;
    root.innerHTML =
      '<div style="max-width:420px;margin:64px auto;padding:0 24px;text-align:center;' +
      'font-family:system-ui,-apple-system,sans-serif;color:#444;">' +
        '<div style="font-size:40px;margin-bottom:16px;">😟</div>' +
        '<h1 style="font-size:18px;font-weight:700;margin:0 0 8px;">載入時出咗少少問題</h1>' +
        '<p style="font-size:14px;line-height:1.7;color:#777;margin:0 0 20px;">' +
          '請試吓重新整理頁面。如果仲係唔得,可以 ' +
          '<a href="https://ig.me/m/linkinhk" target="_blank" rel="noopener noreferrer" ' +
          'style="color:#9060E0;font-weight:600;">IG DM 我哋</a> 求助 💜' +
        '</p>' +
        '<button type="button" onclick="location.reload()" ' +
        'style="background:#9060E0;color:#fff;border:none;border-radius:10px;' +
        'padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer;">重新整理</button>' +
      '</div>';
  }

  // A failed CDN <script> (resource error) or a thrown compile/runtime error
  // means the app likely won't render. Capture both, then check #root after a
  // short grace period (enough for the DOM to be parsed and Babel to finish).
  window.addEventListener(
    "error",
    function () {
      setTimeout(showFallback, 2500);
    },
    true
  );

  // Safety net: if nothing ever rendered, show the fallback after load.
  window.addEventListener("load", function () {
    setTimeout(showFallback, 8000);
  });
})();
