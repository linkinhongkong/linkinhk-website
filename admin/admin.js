// ============================================================
// admin.js — Link in HK admin dashboard (vanilla JS, no framework)
// ============================================================
(function () {
  "use strict";

  var STORAGE_TOKEN = "linkinhk_admin_token";
  var STORAGE_USER = "linkinhk_admin_username";

  // ── DOM ──
  var $ = function (id) { return document.getElementById(id); };
  var loginView = $("admin-login-view");
  var dashboardView = $("admin-dashboard-view");
  var userLabel = $("admin-user-label");
  var logoutBtn = $("admin-logout-btn");
  var loginForm = $("admin-login-form");
  var loginError = $("admin-login-error");
  var loginSubmit = $("admin-login-submit");
  var toastEl = $("admin-toast");

  // Blog form
  var titleInput = $("blog-title");
  var subtitleInput = $("blog-subtitle");
  var slugInput = $("blog-slug");
  var slugRegen = $("blog-slug-regen");
  var slugPreview = $("blog-slug-preview");
  var dateInput = $("blog-date");
  var tagsInput = $("blog-tags");
  var tagsPreview = $("blog-tags-preview");
  var excerptInput = $("blog-excerpt");
  var blocksContainer = $("admin-body-blocks");
  var publishBtn = $("admin-publish-btn");
  var previewBtn = $("admin-preview-btn");
  var previewModal = $("admin-preview-modal");

  // Member form
  var memberInput = $("member-input");
  var memberPreview = $("member-preview");
  var memberResults = $("member-results");
  var submitMembersBtn = $("admin-submit-members-btn");

  // ── State ──
  var bodyBlocks = []; // [{type:'p'|'h2'|'h3'|'quote', text:string} | {type:'list', items:string[]}]
  var slugManuallyEdited = false;

  // ============================================================
  // Init
  // ============================================================
  function init() {
    if (localStorage.getItem(STORAGE_TOKEN)) {
      showDashboard();
    } else {
      showLogin();
    }

    // Default date = today
    dateInput.value = new Date().toISOString().slice(0, 10);

    // Auth UI
    loginForm.addEventListener("submit", onLoginSubmit);
    logoutBtn.addEventListener("click", onLogout);

    // Tabs
    Array.prototype.forEach.call(document.querySelectorAll(".admin-tab"), function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.dataset.tab); });
    });

    // Blog form
    titleInput.addEventListener("input", onTitleInput);
    slugInput.addEventListener("input", function () {
      slugManuallyEdited = true;
      slugPreview.textContent = slugInput.value || "your-slug";
    });
    slugRegen.addEventListener("click", function () {
      slugInput.value = slugify(titleInput.value);
      slugPreview.textContent = slugInput.value || "your-slug";
      slugManuallyEdited = false;
    });
    tagsInput.addEventListener("input", renderTagsPreview);

    Array.prototype.forEach.call(document.querySelectorAll("[data-add]"), function (btn) {
      btn.addEventListener("click", function () { addBlock(btn.dataset.add); });
    });

    previewBtn.addEventListener("click", openPreview);
    publishBtn.addEventListener("click", publishPost);
    previewModal.querySelector(".admin-modal-close").addEventListener("click", closePreview);
    previewModal.querySelector(".admin-modal-backdrop").addEventListener("click", closePreview);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !previewModal.hidden) closePreview();
    });

    // Member form
    memberInput.addEventListener("input", renderMemberPreview);
    submitMembersBtn.addEventListener("click", submitMembers);

    renderBlocks();
  }

  // ============================================================
  // View switching
  // ============================================================
  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
    userLabel.hidden = true;
    logoutBtn.hidden = true;
  }
  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    var u = localStorage.getItem(STORAGE_USER) || "管理員";
    userLabel.textContent = u;
    userLabel.hidden = false;
    logoutBtn.hidden = false;
  }
  function switchTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll(".admin-tab"), function (b) {
      b.classList.toggle("active", b.dataset.tab === name);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".admin-panel"), function (p) {
      p.hidden = p.id !== "admin-tab-" + name;
    });
  }

  // ============================================================
  // Auth
  // ============================================================
  function onLoginSubmit(e) {
    e.preventDefault();
    var username = $("admin-username").value.trim();
    var password = $("admin-password").value;
    if (!username || !password) {
      showLoginError("請輸入帳號同密碼");
      return;
    }
    loginError.hidden = true;
    loginSubmit.disabled = true;
    loginSubmit.textContent = "登入中…";

    fetch(window.webhookUrl("admin-login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(parseJsonSafe)
      .then(function (data) {
        if (data && data.success && data.adminToken) {
          localStorage.setItem(STORAGE_TOKEN, data.adminToken);
          localStorage.setItem(STORAGE_USER, data.username || username);
          $("admin-password").value = "";
          showDashboard();
        } else {
          showLoginError("登入失敗，請再試一次");
        }
      })
      .catch(function () { showLoginError("連線錯誤，請稍後再試"); })
      .then(function () {
        loginSubmit.disabled = false;
        loginSubmit.textContent = "登入";
      });
  }
  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.hidden = false;
  }
  function onLogout() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    showLogin();
  }
  function handleAuthError() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    showLogin();
    toast("登入已過期，請重新登入", true);
  }
  function getToken() { return localStorage.getItem(STORAGE_TOKEN); }

  // ============================================================
  // Blog form — metadata
  // ============================================================
  function onTitleInput() {
    if (!slugManuallyEdited) {
      slugInput.value = slugify(titleInput.value);
      slugPreview.textContent = slugInput.value || "your-slug";
    }
  }
  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9一-鿿]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function renderTagsPreview() {
    var tags = parseTags(tagsInput.value);
    tagsPreview.innerHTML = tags
      .map(function (t) { return '<span class="admin-chip">' + escapeHtml(t) + "</span>"; })
      .join("");
  }
  function parseTags(s) {
    return String(s || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  }

  // ============================================================
  // Blog form — body builder
  // ============================================================
  function addBlock(type) {
    if (type === "list") {
      bodyBlocks.push({ type: "list", items: [] });
    } else {
      bodyBlocks.push({ type: type, text: "" });
    }
    renderBlocks();
  }
  function renderBlocks() {
    blocksContainer.innerHTML = "";
    if (bodyBlocks.length === 0) {
      var empty = document.createElement("div");
      empty.className = "admin-body-empty";
      empty.textContent = "仲未有內容區塊，按上面按鈕新增。";
      blocksContainer.appendChild(empty);
      return;
    }
    bodyBlocks.forEach(function (block, idx) {
      blocksContainer.appendChild(makeBlockRow(block, idx));
    });
  }
  function makeBlockRow(block, idx) {
    var typeLabel = {
      p: "段落",
      h2: "標題 H2",
      h3: "小標題 H3",
      quote: "引言",
      list: "列表"
    }[block.type] || block.type;

    var row = document.createElement("div");
    row.className = "admin-block-row";

    var head = document.createElement("div");
    head.className = "admin-block-head";
    head.innerHTML =
      '<span class="admin-block-type">' + escapeHtml(typeLabel) + "</span>" +
      '<div class="admin-block-actions">' +
        '<button type="button" title="上移" data-move="up"' + (idx === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" title="下移" data-move="down"' + (idx === bodyBlocks.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button type="button" title="刪除" data-delete>✕</button>' +
      "</div>";
    row.appendChild(head);

    if (block.type === "list") {
      row.appendChild(makeListEditor(block));
    } else {
      var ta = document.createElement("textarea");
      ta.className = "text-input";
      ta.rows = block.type === "p" || block.type === "quote" ? 4 : 2;
      ta.value = block.text || "";
      ta.placeholder = "輸入" + typeLabel + "內容…";
      ta.addEventListener("input", function () { block.text = ta.value; });
      row.appendChild(ta);
    }

    head.querySelector('[data-move="up"]').addEventListener("click", function () { moveBlock(idx, -1); });
    head.querySelector('[data-move="down"]').addEventListener("click", function () { moveBlock(idx, 1); });
    head.querySelector("[data-delete]").addEventListener("click", function () {
      bodyBlocks.splice(idx, 1);
      renderBlocks();
    });

    return row;
  }
  function makeListEditor(block) {
    var wrap = document.createElement("div");
    wrap.className = "admin-list-editor";

    block.items.forEach(function (item, i) {
      var line = document.createElement("div");
      line.className = "admin-list-item";
      line.innerHTML = "<span>" + escapeHtml(item) + "</span>" +
        '<button type="button" title="移除" data-remove="' + i + '">✕</button>';
      line.querySelector("[data-remove]").addEventListener("click", function () {
        block.items.splice(i, 1);
        renderBlocks();
      });
      wrap.appendChild(line);
    });

    var inp = document.createElement("input");
    inp.className = "text-input admin-list-input";
    inp.type = "text";
    inp.placeholder = "按 Enter 加入項目";
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var v = inp.value.trim();
        if (v) {
          block.items.push(v);
          renderBlocks();
        }
      }
    });
    wrap.appendChild(inp);
    return wrap;
  }
  function moveBlock(idx, delta) {
    var j = idx + delta;
    if (j < 0 || j >= bodyBlocks.length) return;
    var tmp = bodyBlocks[idx];
    bodyBlocks[idx] = bodyBlocks[j];
    bodyBlocks[j] = tmp;
    renderBlocks();
  }

  // ============================================================
  // Preview modal
  // ============================================================
  function renderBlock(block) {
    if (!block || !block.type) return "";
    switch (block.type) {
      case "p": return "<p>" + escapeHtml(block.text || "") + "</p>";
      case "h2": return "<h2>" + escapeHtml(block.text || "") + "</h2>";
      case "h3": return "<h3>" + escapeHtml(block.text || "") + "</h3>";
      case "quote":
      case "blockquote":
        return "<blockquote>" + escapeHtml(block.text || "") + "</blockquote>";
      case "list":
      case "ul":
        return "<ul>" + (block.items || []).map(function (i) {
          return "<li>" + escapeHtml(i) + "</li>";
        }).join("") + "</ul>";
      default: return "";
    }
  }
  function openPreview() {
    var title = titleInput.value.trim() || "(無標題)";
    var subtitle = subtitleInput.value.trim();
    var date = dateInput.value || new Date().toISOString().slice(0, 10);
    var tags = parseTags(tagsInput.value);
    var tagsHtml = tags
      .map(function (t) { return '<span class="blog-card-tag">' + escapeHtml(t) + "</span>"; })
      .join("");
    var bodyHtml = bodyBlocks.map(renderBlock).join("") ||
      '<p style="color:#888; text-align:center;">(冇內容)</p>';

    previewModal.querySelector(".admin-modal-body").innerHTML =
      '<header class="article-header">' +
        '<div class="article-meta"><span>' + escapeHtml(formatDate(date)) + "</span></div>" +
        '<h1 class="article-title">' + escapeHtml(title) + "</h1>" +
        (subtitle ? '<p class="article-subtitle">' + escapeHtml(subtitle) + "</p>" : "") +
        (tagsHtml ? '<div class="article-tags">' + tagsHtml + "</div>" : "") +
      "</header>" +
      '<div class="article-body">' + bodyHtml + "</div>";
    previewModal.hidden = false;
  }
  function closePreview() { previewModal.hidden = true; }

  // ============================================================
  // Publish blog post
  // ============================================================
  function publishPost() {
    var title = titleInput.value.trim();
    var slug = slugInput.value.trim();
    if (!title) return toast("請輸入標題", true);
    if (!slug) return toast("請輸入 Slug", true);
    if (bodyBlocks.length === 0) return toast("請至少加入一個內容區塊", true);

    var token = getToken();
    if (!token) { showLogin(); return; }

    var payload = {
      adminToken: token,
      slug: slug,
      title: title,
      subtitle: subtitleInput.value.trim(),
      date: dateInput.value || new Date().toISOString().slice(0, 10),
      tags: parseTags(tagsInput.value),
      excerpt: excerptInput.value.trim(),
      body: bodyBlocks
    };

    setBusy(publishBtn, "發布中…");
    fetch(window.webhookUrl("publish-blog-post"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { handleAuthError(); throw new Error("auth"); }
        return parseJsonSafe(r);
      })
      .then(function (data) {
        if (data && data.success !== false) {
          toast("已送出，約 1 分鐘後生效 ✅");
          resetBlogForm();
        } else {
          toast((data && data.error) || "發布失敗", true);
        }
      })
      .catch(function (e) {
        if (e && e.message !== "auth") toast("連線錯誤，請稍後再試", true);
      })
      .then(function () { unsetBusy(publishBtn, "發布"); });
  }
  function resetBlogForm() {
    titleInput.value = "";
    subtitleInput.value = "";
    slugInput.value = "";
    slugPreview.textContent = "your-slug";
    dateInput.value = new Date().toISOString().slice(0, 10);
    tagsInput.value = "";
    excerptInput.value = "";
    bodyBlocks = [];
    slugManuallyEdited = false;
    renderBlocks();
    renderTagsPreview();
  }

  // ============================================================
  // Member tab
  // ============================================================
  function parseHandles(s) {
    var seen = {};
    return String(s || "").split(",").map(function (x) {
      return x.trim().replace(/^@/, "");
    }).filter(function (x) {
      if (!x || seen[x]) return false;
      seen[x] = true;
      return true;
    });
  }
  function renderMemberPreview() {
    var handles = parseHandles(memberInput.value);
    memberPreview.innerHTML = handles
      .map(function (h) { return '<span class="admin-chip">@' + escapeHtml(h) + "</span>"; })
      .join("");
  }
  function submitMembers() {
    var handles = parseHandles(memberInput.value);
    if (handles.length === 0) return toast("請輸入至少一個 Instagram username", true);

    var token = getToken();
    if (!token) { showLogin(); return; }

    setBusy(submitMembersBtn, "提交中…");
    fetch(window.webhookUrl("new-member"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: token, instagramUsernames: handles })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { handleAuthError(); throw new Error("auth"); }
        return parseJsonSafe(r);
      })
      .then(function (data) {
        if (!data || data.success === false) {
          toast((data && data.error) || "提交失敗", true);
          return;
        }
        handleMemberSuccess(data, handles);
      })
      .catch(function (e) {
        if (e && e.message !== "auth") toast("連線錯誤，請稍後再試", true);
      })
      .then(function () { unsetBusy(submitMembersBtn, "提交"); });
  }

  // Response from n8n looks like:
  //   { success, summary: { requested, updated, notFound, ambiguous, alreadyActivated },
  //     updated: [], notFound: [], ambiguous: [], alreadyActivated: [] }
  function handleMemberSuccess(data, submitted) {
    var updated = asArray(data.updated).map(toHandle);
    var notFound = asArray(data.notFound).map(toHandle);
    var ambiguous = asArray(data.ambiguous).map(toHandle);
    var already = asArray(data.alreadyActivated).map(toHandle);

    renderMemberResults({ updated: updated, notFound: notFound, ambiguous: ambiguous, alreadyActivated: already });

    var problems = notFound.length + ambiguous.length;
    if (problems === 0 && updated.length > 0) {
      toast("已新增 " + updated.length + " 位會員 ✅");
    } else if (updated.length > 0 || already.length > 0) {
      toast("處理咗 " + submitted.length + " 個 — " + (updated.length + already.length) + " 成功，" + problems + " 有問題", problems > 0);
    } else {
      toast(problems + " 個 username 處理唔到", true);
    }

    // Keep only the failed handles in the textarea so the user can fix + resubmit.
    // Successes (updated + alreadyActivated) get cleared.
    var keep = notFound.concat(ambiguous);
    memberInput.value = keep.join(", ");
    renderMemberPreview();
  }

  function renderMemberResults(r) {
    memberResults.innerHTML = "";

    var total = r.updated.length + r.alreadyActivated.length + r.notFound.length + r.ambiguous.length;
    if (total === 0) {
      memberResults.hidden = true;
      return;
    }
    memberResults.hidden = false;

    var headline = document.createElement("div");
    headline.className = "admin-results-headline";
    headline.textContent = "處理結果";
    memberResults.appendChild(headline);

    var sections = [
      { key: "updated", title: "✅ 已新增", items: r.updated, cls: "ok" },
      { key: "alreadyActivated", title: "⏭ 已經啟用", items: r.alreadyActivated, cls: "warn" },
      { key: "notFound", title: "❌ 搵唔到", items: r.notFound, cls: "err" },
      { key: "ambiguous", title: "⚠️ 多個 match", items: r.ambiguous, cls: "warn" }
    ];

    sections.forEach(function (s) {
      if (!s.items || s.items.length === 0) return;
      var section = document.createElement("div");
      section.className = "admin-results-section " + s.cls;
      section.innerHTML =
        '<div class="admin-results-section-title">' +
          escapeHtml(s.title) + ' <span class="count">(' + s.items.length + ')</span>' +
        '</div>' +
        '<div class="admin-results-chips">' +
          s.items.map(function (h) {
            return '<span class="admin-results-chip">@' + escapeHtml(h) + '</span>';
          }).join("") +
        '</div>';
      memberResults.appendChild(section);
    });
  }

  function asArray(v) { return Array.isArray(v) ? v : []; }

  // n8n may return either a plain string ("alice") or an object
  // ({ instagram: "alice", recordId: "..." }) per array slot.
  function toHandle(item) {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      return item.instagram || item.username || item.handle || "";
    }
    return "";
  }

  // ============================================================
  // Helpers
  // ============================================================
  function setBusy(btn, label) {
    btn.dataset.origLabel = btn.dataset.origLabel || btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
  }
  function unsetBusy(btn, fallback) {
    btn.disabled = false;
    btn.textContent = btn.dataset.origLabel || fallback;
    delete btn.dataset.origLabel;
  }
  function parseJsonSafe(r) {
    return r.text().then(function (t) {
      try { return JSON.parse(t); } catch (e) { return {}; }
    });
  }
  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className = "admin-toast" + (isError ? " error" : "");
    toastEl.hidden = false;
    // force reflow so transition runs even when re-triggered
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () { toastEl.hidden = true; }, 250);
    }, 2800);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function formatDate(s) {
    if (!s) return "";
    var d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.getFullYear() + "." +
      String(d.getMonth() + 1).padStart(2, "0") + "." +
      String(d.getDate()).padStart(2, "0");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
