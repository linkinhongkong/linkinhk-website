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

  // Manage posts list
  var postsList = $("admin-posts-list");
  var postsRefreshBtn = $("admin-posts-refresh");

  // Activities editor
  var activitiesLoading = $("activities-loading");
  var activitiesEditor = $("activities-editor");
  var activitiesQuestionLabel = $("activities-question-label");
  var activitiesQuestionHint = $("activities-question-hint");
  var activitiesListEl = $("activities-list");
  var activitiesAddBtn = $("activities-add-btn");
  var activitiesSaveBtn = $("activities-save-btn");
  var activitiesReloadBtn = $("activities-reload-btn");

  // Member form
  var memberInput = $("member-input");
  var memberPreview = $("member-preview");
  var memberResults = $("member-results");
  var memberSuggestions = $("member-suggestions");
  var submitMembersBtn = $("admin-submit-members-btn");
  var memberTitle = $("member-title");
  var memberSub = $("member-sub");
  var memberHint = $("member-hint");
  var memberSubtabs = document.querySelectorAll(".admin-subtab");

  // Lookup tab
  var lookupInput = $("lookup-input");
  var lookupPreview = $("lookup-preview");
  var lookupResults = $("lookup-results");
  var lookupSearchBtn = $("admin-search-members-btn");
  var lookupSuggestions = $("lookup-suggestions");

  // Dashboard tab
  var dashboardState = $("dashboard-state");
  var dashboardContent = $("dashboard-content");
  var dashboardRefresh = $("dashboard-refresh");
  var dashKpis = $("dash-kpis");

  // Follow-up tab
  var followupLoadBtn = $("followup-load-btn");
  var followupState = $("followup-state");
  var followupContent = $("followup-content");
  var followupSummary = $("followup-summary");
  var followupListEl = $("followup-list");

  // ── State ──
  var bodyBlocks = []; // [{type:'p'|'h2'|'h3'|'quote', text:string} | {type:'list', items:string[]}]
  var slugManuallyEdited = false;
  var activitiesData = { question: { label: "", hint: "" }, items: [] };
  var lookupState = { activeHandle: null, results: [] };
  var lookupTypeahead = null;
  var memberTypeahead = null;
  var dashboardCharts = [];
  var dashboardLoaded = false;

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
    postsRefreshBtn.addEventListener("click", function () { loadPostsList(); });

    // Activities tab
    activitiesAddBtn.addEventListener("click", onActivityAdd);
    activitiesSaveBtn.addEventListener("click", onActivitiesSave);
    activitiesReloadBtn.addEventListener("click", loadActivities);
    previewModal.querySelector(".admin-modal-close").addEventListener("click", closePreview);
    previewModal.querySelector(".admin-modal-backdrop").addEventListener("click", closePreview);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !previewModal.hidden) closePreview();
    });

    // Member form
    memberTypeahead = createTypeahead({
      input: memberInput, suggestionsEl: memberSuggestions, previewEl: memberPreview,
      onSubmit: submitMembers
    });
    submitMembersBtn.addEventListener("click", submitMembers);
    Array.prototype.forEach.call(memberSubtabs, function (btn) {
      btn.addEventListener("click", function () { selectMembershipTab(btn.dataset.membership); });
    });
    applyMembershipWording(currentMembership);

    // Lookup tab
    lookupTypeahead = createTypeahead({
      input: lookupInput, suggestionsEl: lookupSuggestions, previewEl: lookupPreview,
      onSubmit: searchMembers
    });
    lookupSearchBtn.addEventListener("click", searchMembers);

    // Dashboard tab
    dashboardRefresh.addEventListener("click", function () { loadDashboard(); });

    // Follow-up tab
    followupLoadBtn.addEventListener("click", loadFollowups);

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
    loadPostsList();
    loadActivities();
  }
  function switchTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll(".admin-tab"), function (b) {
      b.classList.toggle("active", b.dataset.tab === name);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".admin-panel"), function (p) {
      p.hidden = p.id !== "admin-tab-" + name;
    });
    // Lazy-load the dashboard the first time it's opened: its charts must
    // render into a visible canvas, otherwise Chart.js sizes them to 0.
    if (name === "dashboard" && !dashboardLoaded) loadDashboard();
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
          setTimeout(loadPostsList, 70 * 1000);
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
  // Manage existing posts
  // ============================================================
  function loadPostsList() {
    postsList.innerHTML = '<div class="admin-posts-state">載入中…</div>';
    fetch("/blog/posts.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (posts) { renderPostsList(Array.isArray(posts) ? posts : []); })
      .catch(function () {
        postsList.innerHTML = '<div class="admin-posts-state">載入失敗,請重試。</div>';
      });
  }

  function renderPostsList(posts) {
    if (!posts.length) {
      postsList.innerHTML = '<div class="admin-posts-state">未有已發布文章。</div>';
      return;
    }
    postsList.innerHTML = "";
    posts.forEach(function (post) {
      var slug = post.slug || "";
      if (!slug) return;
      var item = document.createElement("div");
      item.className = "admin-post-item";
      item.dataset.slug = slug;

      var main = document.createElement("div");
      main.className = "admin-post-main";
      var title = document.createElement("div");
      title.className = "admin-post-title";
      title.textContent = post.title || slug;
      var meta = document.createElement("div");
      meta.className = "admin-post-meta";
      meta.innerHTML =
        '<span>' + escapeHtml(formatDate(post.date) || "—") + '</span>' +
        '<span>/' + escapeHtml(slug) + '</span>';
      main.appendChild(title);
      main.appendChild(meta);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-post-delete";
      btn.textContent = "🗑 刪除";
      btn.addEventListener("click", function () { onDeletePost(item, post); });

      item.appendChild(main);
      item.appendChild(btn);
      postsList.appendChild(item);
    });
  }

  function onDeletePost(itemEl, post) {
    var title = post.title || post.slug;
    if (!window.confirm("確定要刪除「" + title + "」?\n大約 1 分鐘後會喺 /blog 消失。")) return;

    var token = getToken();
    if (!token) { showLogin(); return; }

    var btn = itemEl.querySelector(".admin-post-delete");
    btn.disabled = true;
    btn.textContent = "刪除中…";
    itemEl.classList.add("pending");

    fetch(window.webhookUrl("delete-blog-post"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: token, slug: post.slug })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { handleAuthError(); throw new Error("auth"); }
        return parseJsonSafe(r).then(function (data) {
          if (!r.ok || (data && data.success === false)) {
            throw new Error((data && data.error) || "delete failed");
          }
          return data;
        });
      })
      .then(function () {
        toast("已送出,約 1 分鐘後生效 ✅");
        itemEl.parentNode && itemEl.parentNode.removeChild(itemEl);
        if (!postsList.querySelector(".admin-post-item")) {
          postsList.innerHTML = '<div class="admin-posts-state">未有已發布文章。</div>';
        }
      })
      .catch(function (e) {
        if (e && e.message === "auth") return;
        toast("刪除失敗,請稍後再試", true);
        btn.disabled = false;
        btn.textContent = "🗑 刪除";
        itemEl.classList.remove("pending");
      });
  }

  // ============================================================
  // Activities editor
  // ============================================================
  var ACTIVITY_DEFAULTS = {
    question: {
      label: "請排序你最想參加嘅活動",
      hint: "用箭頭調整順序（最想參加嘅排最上面）"
    },
    items: []
  };

  function loadActivities() {
    activitiesLoading.hidden = false;
    activitiesLoading.textContent = "載入中…";
    activitiesEditor.hidden = true;
    fetch("/data/activities.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) {
          if (r.status === 404) return ACTIVITY_DEFAULTS;
          throw new Error("load failed");
        }
        return r.json();
      })
      .then(function (data) {
        activitiesData = normalizeActivitiesData(data);
        renderActivitiesEditor();
        activitiesLoading.hidden = true;
        activitiesEditor.hidden = false;
      })
      .catch(function () {
        activitiesLoading.hidden = false;
        activitiesLoading.textContent = "載入失敗,請重試。";
        activitiesEditor.hidden = true;
      });
  }

  function normalizeActivitiesData(d) {
    var safe = d && typeof d === "object" ? d : {};
    var q = safe.question && typeof safe.question === "object" ? safe.question : {};
    return {
      question: {
        label: typeof q.label === "string" ? q.label : ACTIVITY_DEFAULTS.question.label,
        hint: typeof q.hint === "string" ? q.hint : ACTIVITY_DEFAULTS.question.hint
      },
      items: (Array.isArray(safe.items) ? safe.items : []).map(function (it) {
        return {
          id: it && it.id ? String(it.id) : genActivityId(),
          icon: it && typeof it.icon === "string" ? it.icon : "",
          label: it && typeof it.label === "string" ? it.label : "",
          sub: it && typeof it.sub === "string" ? it.sub : ""
        };
      })
    };
  }

  function genActivityId() {
    return "act-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  }

  function renderActivitiesEditor() {
    activitiesQuestionLabel.value = activitiesData.question.label || "";
    activitiesQuestionHint.value = activitiesData.question.hint || "";
    activitiesListEl.innerHTML = "";
    activitiesData.items.forEach(function (item, idx) {
      activitiesListEl.appendChild(buildActivityRow(item, idx));
    });
  }

  function buildActivityRow(item, idx) {
    var row = document.createElement("div");
    row.className = "activity-row";
    row.dataset.id = item.id;

    var iconInput = document.createElement("input");
    iconInput.className = "text-input activity-row-icon";
    iconInput.type = "text";
    iconInput.value = item.icon || "";
    iconInput.placeholder = "☕";
    iconInput.maxLength = 4;
    iconInput.addEventListener("input", function () { item.icon = iconInput.value; });

    var labelInput = document.createElement("input");
    labelInput.className = "text-input";
    labelInput.type = "text";
    labelInput.value = item.label || "";
    labelInput.placeholder = "活動名稱";
    labelInput.addEventListener("input", function () { item.label = labelInput.value; });

    var subInput = document.createElement("input");
    subInput.className = "text-input activity-row-sub";
    subInput.type = "text";
    subInput.value = item.sub || "";
    subInput.placeholder = "地點 / 說明";
    subInput.addEventListener("input", function () { item.sub = subInput.value; });

    var arrows = document.createElement("div");
    arrows.className = "activity-row-arrows";
    var up = document.createElement("button");
    up.type = "button";
    up.className = "activity-row-arrow";
    up.textContent = "▲";
    up.disabled = idx === 0;
    up.addEventListener("click", function () { moveActivity(idx, -1); });
    var down = document.createElement("button");
    down.type = "button";
    down.className = "activity-row-arrow";
    down.textContent = "▼";
    down.disabled = idx === activitiesData.items.length - 1;
    down.addEventListener("click", function () { moveActivity(idx, 1); });
    arrows.appendChild(up);
    arrows.appendChild(down);

    var del = document.createElement("button");
    del.type = "button";
    del.className = "activity-row-delete";
    del.textContent = "🗑";
    del.title = "刪除";
    del.addEventListener("click", function () { onActivityDelete(idx); });

    row.appendChild(iconInput);
    row.appendChild(labelInput);
    row.appendChild(subInput);
    row.appendChild(arrows);
    row.appendChild(del);
    return row;
  }

  function moveActivity(idx, dir) {
    var arr = activitiesData.items;
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    var tmp = arr[idx];
    arr[idx] = arr[newIdx];
    arr[newIdx] = tmp;
    renderActivitiesEditor();
  }

  function onActivityAdd() {
    activitiesData.items.push({ id: genActivityId(), icon: "", label: "", sub: "" });
    renderActivitiesEditor();
    var rows = activitiesListEl.querySelectorAll(".activity-row");
    var last = rows[rows.length - 1];
    if (last) {
      var firstInput = last.querySelector("input");
      if (firstInput) firstInput.focus();
    }
  }

  function onActivityDelete(idx) {
    var item = activitiesData.items[idx];
    var name = (item && (item.label || item.icon)) || "呢個活動";
    if (!window.confirm("確定要刪除「" + name + "」?")) return;
    activitiesData.items.splice(idx, 1);
    renderActivitiesEditor();
  }

  function onActivitiesSave() {
    var question = {
      label: (activitiesQuestionLabel.value || "").trim(),
      hint: (activitiesQuestionHint.value || "").trim()
    };
    if (!question.label) return toast("請輸入問題標題", true);

    var cleaned = activitiesData.items.map(function (it) {
      return {
        id: it.id || genActivityId(),
        icon: (it.icon || "").trim(),
        label: (it.label || "").trim(),
        sub: (it.sub || "").trim()
      };
    });
    if (cleaned.length === 0) return toast("至少要有一個活動", true);
    for (var i = 0; i < cleaned.length; i++) {
      if (!cleaned[i].label) return toast("第 " + (i + 1) + " 個活動未有標題", true);
      if (!cleaned[i].icon) return toast("第 " + (i + 1) + " 個活動未有 emoji", true);
    }

    var token = getToken();
    if (!token) { showLogin(); return; }

    var payload = { adminToken: token, data: { question: question, items: cleaned } };

    setBusy(activitiesSaveBtn, "儲存中…");
    fetch(window.webhookUrl("update-activities"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { handleAuthError(); throw new Error("auth"); }
        return parseJsonSafe(r).then(function (data) {
          if (!r.ok || (data && data.success === false)) {
            throw new Error((data && data.error) || "save failed");
          }
          return data;
        });
      })
      .then(function () {
        activitiesData.question = question;
        activitiesData.items = cleaned;
        renderActivitiesEditor();
        toast("已送出,約 1 分鐘後生效 ✅");
      })
      .catch(function (e) {
        if (e && e.message === "auth") return;
        toast("儲存失敗,請稍後再試", true);
      })
      .then(function () { unsetBusy(activitiesSaveBtn, "儲存"); });
  }

  // ============================================================
  // Member tab
  // ============================================================
  // Each sub-tab maps to a membership value the n8n flow writes to the DB.
  var MEMBERSHIP_ACTIONS = {
    "activated": {
      verb: "啟用",
      title: "啟用會員",
      sub: "輸入 Instagram username，按「提交」會 trigger n8n 嘅 follow-up flow。",
      hint: "輸入字母即時搜尋會員，撳一下或者 Enter 加入。可以加多個一齊提交。",
      btn: "啟用"
    },
    "deactivated": {
      verb: "停用",
      title: "停用會員",
      sub: "輸入 Instagram username，提交後會將會員設為停用。",
      hint: "輸入字母即時搜尋會員，撳一下或者 Enter 加入。可以加多個一齊提交。",
      btn: "停用"
    },
    "block-match": {
      verb: "封鎖配對",
      title: "封鎖配對",
      sub: "輸入 Instagram username，提交後會封鎖該會員嘅配對。",
      hint: "輸入字母即時搜尋會員，撳一下或者 Enter 加入。可以加多個一齊提交。",
      btn: "封鎖配對"
    },
    "force-match": {
      verb: "強制配對",
      title: "強制配對",
      sub: "輸入 Instagram username，提交後會強制該會員配對。",
      hint: "輸入字母即時搜尋會員，撳一下或者 Enter 加入。可以加多個一齊提交。",
      btn: "強制配對"
    }
  };
  var currentMembership = "activated";

  function applyMembershipWording(value) {
    var a = MEMBERSHIP_ACTIONS[value] || MEMBERSHIP_ACTIONS.activated;
    memberTitle.textContent = a.title;
    memberSub.textContent = a.sub;
    memberHint.textContent = a.hint;
    submitMembersBtn.textContent = a.btn;
  }

  function selectMembershipTab(value) {
    if (!MEMBERSHIP_ACTIONS[value]) return;
    currentMembership = value;
    Array.prototype.forEach.call(memberSubtabs, function (b) {
      b.classList.toggle("active", b.dataset.membership === value);
    });
    applyMembershipWording(value);
    // Reset between actions so handles aren't carried across sub-tabs.
    memberTypeahead.setHandles([]);
    renderMemberResults({ updated: [], alreadySet: [], notFound: [], ambiguous: [] });
  }

  function submitMembers() {
    memberTypeahead.commitInput();
    var handles = memberTypeahead.state.handles.slice();
    if (handles.length === 0) return toast("請輸入至少一個 Instagram username", true);

    var token = getToken();
    if (!token) { showLogin(); return; }

    setBusy(submitMembersBtn, "提交中…");
    fetch(window.webhookUrl("set-membership"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: token, instagramUsernames: handles, membership: currentMembership })
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
      .then(function () { unsetBusy(submitMembersBtn, (MEMBERSHIP_ACTIONS[currentMembership] || MEMBERSHIP_ACTIONS.activated).btn); });
  }

  // Response from n8n looks like:
  //   { success, summary: { requested, updated, notFound, ambiguous, unchanged },
  //     updated: [], notFound: [], ambiguous: [], unchanged: [] }
  // ("unchanged" = rows already at the requested membership; older flows called it
  // "alreadyActivated", which we still accept.)
  function handleMemberSuccess(data, submitted) {
    var verb = (MEMBERSHIP_ACTIONS[currentMembership] || MEMBERSHIP_ACTIONS.activated).verb;
    var updated = asArray(data.updated).map(toHandle);
    var notFound = asArray(data.notFound).map(toHandle);
    var ambiguous = asArray(data.ambiguous).map(toHandle);
    var already = asArray(data.unchanged || data.alreadyActivated).map(toHandle);

    renderMemberResults({ updated: updated, notFound: notFound, ambiguous: ambiguous, alreadySet: already });

    var problems = notFound.length + ambiguous.length;
    if (problems === 0 && updated.length > 0) {
      toast("已" + verb + " " + updated.length + " 位會員 ✅");
    } else if (updated.length > 0 || already.length > 0) {
      toast("處理咗 " + submitted.length + " 個 — " + (updated.length + already.length) + " 成功，" + problems + " 有問題", problems > 0);
    } else {
      toast(problems + " 個 username 處理唔到", true);
    }

    // Keep only the failed handles as chips so the user can fix + resubmit.
    // Successes (updated + alreadySet) get cleared.
    memberTypeahead.setHandles(notFound.concat(ambiguous));
  }

  function renderMemberResults(r) {
    memberResults.innerHTML = "";

    var verb = (MEMBERSHIP_ACTIONS[currentMembership] || MEMBERSHIP_ACTIONS.activated).verb;
    var alreadySet = r.alreadySet || [];
    var total = r.updated.length + alreadySet.length + r.notFound.length + r.ambiguous.length;
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
      { key: "updated", title: "✅ 已" + verb, items: r.updated, cls: "ok" },
      { key: "alreadySet", title: "⏭ 已經係呢個狀態", items: alreadySet, cls: "warn" },
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
  // Lookup tab
  // ============================================================

  // Shared full member list, fetched once per session for client-side typeahead
  // (used by both the lookup and add-member tabs).
  var memberListCache = { items: [], loaded: false, loading: false };

  // Silently degrades to manual entry if the request fails.
  function loadMemberList() {
    if (memberListCache.loaded || memberListCache.loading) return;
    var token = getToken();
    if (!token) return;
    memberListCache.loading = true;
    fetch(window.webhookUrl("list-members"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: token })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { handleAuthError(); throw new Error("auth"); }
        return parseJsonSafe(r);
      })
      .then(function (data) {
        // Unwrap n8n's 1-element "Respond to Webhook" wrapper around an object.
        if (Array.isArray(data) && data.length === 1 && data[0] &&
            typeof data[0] === "object" && !data[0].instagram) {
          data = data[0];
        }
        memberListCache.items = normalizeMemberList(data);
        memberListCache.loaded = true;
      })
      .catch(function () { /* typeahead unavailable; manual entry still works */ })
      .then(function () { memberListCache.loading = false; });
  }

  // Accept ["alice"], [{instagram,name}], {members:[...]}, {usernames:[...]},
  // or {results:[...]}. Returns deduped [{ instagram, name }].
  function normalizeMemberList(data) {
    var list = [];
    if (Array.isArray(data)) list = data;
    else if (data && Array.isArray(data.members)) list = data.members;
    else if (data && Array.isArray(data.usernames)) list = data.usernames;
    else if (data && Array.isArray(data.results)) list = data.results;
    var seen = {};
    var out = [];
    list.forEach(function (item) {
      var ig, name;
      if (typeof item === "string") { ig = item; }
      else if (item && typeof item === "object") {
        ig = item.instagram || item.username || item.handle;
        name = item.name;
      }
      ig = String(ig || "").replace(/^@/, "").trim();
      if (!ig) return;
      var key = ig.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push({ instagram: ig, name: name || "" });
    });
    return out;
  }

  // Reusable username typeahead. Queued handles (the removable chips) are the
  // source of truth in `state.handles`. cfg: { input, suggestionsEl, previewEl,
  // onSubmit }.
  function createTypeahead(cfg) {
    var state = { handles: [], active: -1 };

    function renderChips() {
      cfg.previewEl.innerHTML = "";
      state.handles.forEach(function (h) {
        var chip = document.createElement("span");
        chip.className = "admin-chip removable";
        chip.innerHTML = "@" + escapeHtml(h) +
          '<button type="button" class="admin-chip-x" aria-label="移除">✕</button>';
        chip.querySelector(".admin-chip-x").addEventListener("click", function () {
          removeHandle(h);
        });
        cfg.previewEl.appendChild(chip);
      });
    }

    function addHandle(raw) {
      var h = String(raw || "").trim().replace(/^@/, "");
      if (!h) return;
      var exists = state.handles.some(function (x) { return x.toLowerCase() === h.toLowerCase(); });
      if (!exists) state.handles.push(h);
      renderChips();
    }

    function removeHandle(h) {
      state.handles = state.handles.filter(function (x) {
        return x.toLowerCase() !== h.toLowerCase();
      });
      renderChips();
    }

    function setHandles(arr) {
      state.handles = (arr || []).slice();
      renderChips();
    }

    function onInput() {
      // Pasting a comma-separated list adds all but the trailing token as chips.
      if (cfg.input.value.indexOf(",") !== -1) {
        var parts = cfg.input.value.split(",");
        var last = parts.pop();
        parts.forEach(addHandle);
        cfg.input.value = last.replace(/^\s*@?/, "");
      }
      var q = cfg.input.value.replace(/^@/, "").trim().toLowerCase();
      if (!q) return hide();
      var queued = {};
      state.handles.forEach(function (h) { queued[h.toLowerCase()] = true; });
      var matches = memberListCache.items.filter(function (m) {
        return m.instagram.toLowerCase().indexOf(q) === 0 && !queued[m.instagram.toLowerCase()];
      }).slice(0, 8);
      render(matches);
    }

    function render(matches) {
      state.active = -1;
      cfg.suggestionsEl.innerHTML = "";
      if (!matches.length) return hide();
      matches.forEach(function (m, i) {
        var li = document.createElement("li");
        li.className = "ta-suggestion";
        li.dataset.handle = m.instagram;
        li.innerHTML = '<span class="ta-suggestion-handle">@' + escapeHtml(m.instagram) + "</span>" +
          (m.name ? '<span class="ta-suggestion-name">' + escapeHtml(m.name) + "</span>" : "");
        li.addEventListener("mousedown", function (e) {
          e.preventDefault(); // keep focus on the input
          choose(m.instagram);
        });
        li.addEventListener("mouseenter", function () { setActive(i); });
        cfg.suggestionsEl.appendChild(li);
      });
      cfg.suggestionsEl.hidden = false;
    }

    function hide() {
      cfg.suggestionsEl.hidden = true;
      cfg.suggestionsEl.innerHTML = "";
      state.active = -1;
    }

    function setActive(i) {
      state.active = i;
      Array.prototype.forEach.call(cfg.suggestionsEl.children, function (li, idx) {
        li.classList.toggle("active", idx === i);
      });
    }

    function choose(handle) {
      addHandle(handle);
      cfg.input.value = "";
      hide();
      cfg.input.focus();
    }

    // Fold any half-typed username into the chip queue (called before submit).
    function commitInput() {
      if (cfg.input.value.trim()) { addHandle(cfg.input.value); cfg.input.value = ""; }
      hide();
    }

    function onKeydown(e) {
      var items = cfg.suggestionsEl.children;
      var open = !cfg.suggestionsEl.hidden && items.length;
      if (e.key === "ArrowDown" && open) {
        e.preventDefault();
        setActive((state.active + 1) % items.length);
      } else if (e.key === "ArrowUp" && open) {
        e.preventDefault();
        setActive((state.active - 1 + items.length) % items.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (open && state.active >= 0) {
          choose(items[state.active].dataset.handle);
        } else if (cfg.input.value.trim()) {
          addHandle(cfg.input.value);
          cfg.input.value = "";
          hide();
        } else if (cfg.onSubmit) {
          cfg.onSubmit();
        }
      } else if (e.key === "Escape") {
        hide();
      } else if (e.key === "Backspace" && !cfg.input.value && state.handles.length) {
        removeHandle(state.handles[state.handles.length - 1]);
      }
    }

    cfg.input.addEventListener("focus", loadMemberList);
    cfg.input.addEventListener("input", onInput);
    cfg.input.addEventListener("keydown", onKeydown);
    document.addEventListener("click", function (e) {
      if (!cfg.suggestionsEl.contains(e.target) && e.target !== cfg.input) hide();
    });

    return {
      state: state,
      addHandle: addHandle,
      setHandles: setHandles,
      commitInput: commitInput,
      hide: hide
    };
  }

  function searchMembers() {
    lookupTypeahead.commitInput();
    var handles = lookupTypeahead.state.handles.slice();
    if (handles.length === 0) return toast("請輸入至少一個 Instagram username", true);

    var token = getToken();
    if (!token) { showLogin(); return; }

    setBusy(lookupSearchBtn, "搜尋中…");
    fetch(window.webhookUrl("lookup-member"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: token, instagramUsernames: handles })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { handleAuthError(); throw new Error("auth"); }
        return parseJsonSafe(r);
      })
      .then(function (data) {
        // n8n's "Respond to Webhook" node often wraps the payload in a
        // 1-element array. Unwrap so { success, results } parsing works.
        if (Array.isArray(data) && data.length === 1 && data[0] && typeof data[0] === "object") {
          data = data[0];
        }
        if (!data || data.success === false) {
          toast((data && data.error) || "搜尋失敗", true);
          return;
        }
        var results = normalizeLookupResults(data, handles);
        var firstFound = results.find(function (r) { return r.found; });
        lookupState.results = results;
        lookupState.activeHandle = (firstFound || results[0] || {}).instagram || null;
        renderLookupResults();

        var foundCount = results.filter(function (r) { return r.found; }).length;
        var missing = results.length - foundCount;
        if (foundCount > 0 && missing === 0) {
          toast("搵到 " + foundCount + " 位會員 ✅");
        } else if (foundCount > 0) {
          toast("搵到 " + foundCount + " 位 · " + missing + " 位搵唔到", true);
        } else {
          toast("全部 " + results.length + " 個 username 都搵唔到", true);
        }
      })
      .catch(function (e) {
        if (e && e.message !== "auth") toast("連線錯誤，請稍後再試", true);
      })
      .then(function () { unsetBusy(lookupSearchBtn, "🔍 搜尋"); });
  }

  // n8n response may vary: results array, or { results: { handle: {...} } },
  // or top-level keys. Normalize to a stable [{ instagram, found, profile?, matchHistory? }]
  // keyed by the handles the admin actually submitted (so order matches input
  // and missing replies show as not-found).
  function normalizeLookupResults(data, submitted) {
    var byHandle = {};
    var rawList = [];
    if (Array.isArray(data.results)) rawList = data.results;
    else if (data.results && typeof data.results === "object") {
      rawList = Object.keys(data.results).map(function (k) {
        var v = data.results[k] || {};
        return { instagram: v.instagram || k, found: v.found, profile: v.profile, matchHistory: v.matchHistory };
      });
    } else if (Array.isArray(data)) {
      rawList = data;
    }
    rawList.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      var handle = String(item.instagram || (item.profile && item.profile.instagram) || "").replace(/^@/, "").trim();
      if (!handle) return;
      var found = item.found;
      if (typeof found !== "boolean") found = !!item.profile;
      byHandle[handle.toLowerCase()] = {
        instagram: handle,
        found: found,
        profile: item.profile || null,
        matchHistory: Array.isArray(item.matchHistory) ? item.matchHistory : []
      };
    });
    return submitted.map(function (h) {
      var hit = byHandle[h.toLowerCase()];
      if (hit) return hit;
      return { instagram: h, found: false, profile: null, matchHistory: [] };
    });
  }

  function renderLookupResults() {
    lookupResults.innerHTML = "";
    if (!lookupState.results.length) {
      lookupResults.hidden = true;
      return;
    }
    lookupResults.hidden = false;

    var tabsEl = document.createElement("div");
    tabsEl.className = "lookup-tabs";
    lookupState.results.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      var classes = ["lookup-tab"];
      if (!item.found) classes.push("notfound");
      if (item.instagram === lookupState.activeHandle) classes.push("active");
      btn.className = classes.join(" ");
      btn.innerHTML = "@" + escapeHtml(item.instagram) +
        ' <span class="lookup-tab-mark">' + (item.found ? "✓" : "✗") + "</span>";
      btn.addEventListener("click", function () {
        lookupState.activeHandle = item.instagram;
        renderLookupResults();
      });
      tabsEl.appendChild(btn);
    });
    lookupResults.appendChild(tabsEl);

    var active = lookupState.results.find(function (r) { return r.instagram === lookupState.activeHandle; })
      || lookupState.results[0];
    var panel = document.createElement("div");
    panel.className = "lookup-panel";
    if (active.found && active.profile) {
      renderProfileCard(panel, active.profile, active.matchHistory || []);
    } else {
      renderNotFound(panel, active.instagram);
    }
    lookupResults.appendChild(panel);
  }

  function renderNotFound(panel, handle) {
    var wrap = document.createElement("div");
    wrap.className = "lookup-notfound";
    wrap.innerHTML =
      '<div class="lookup-notfound-emoji">😕</div>' +
      '<div class="lookup-notfound-title">搵唔到 @' + escapeHtml(handle) + "</div>" +
      '<div class="lookup-notfound-sub">請確認 username 有冇打錯，或者佢未係會員。</div>';
    panel.appendChild(wrap);
  }

  function renderProfileCard(panel, profile, history) {
    // Photos
    var photos = ["my-photo-1", "my-photo-2", "my-photo-3"]
      .map(function (k) { return profile[k]; })
      .filter(Boolean);
    if (photos.length) {
      var photoRow = document.createElement("div");
      photoRow.className = "lookup-profile-photos";
      photos.forEach(function (src) {
        var img = document.createElement("img");
        img.src = src;
        img.alt = profile.name || "";
        img.loading = "lazy";
        img.addEventListener("click", function () { openPhotoModal(src); });
        img.addEventListener("error", function () { img.style.display = "none"; });
        photoRow.appendChild(img);
      });
      panel.appendChild(photoRow);
    }

    // Header
    var header = document.createElement("div");
    header.className = "lookup-profile-header";
    if (profile.name) {
      var name = document.createElement("div");
      name.className = "lookup-profile-name";
      name.textContent = profile.name;
      header.appendChild(name);
    }
    var handle = profile.instagram || "";
    if (handle) {
      var chip = document.createElement("span");
      chip.className = "lookup-profile-handle";
      chip.textContent = "@" + String(handle).replace(/^@/, "");
      header.appendChild(chip);
    }
    var membership = getMembershipBadge(profile);
    if (membership) {
      var mb = document.createElement("span");
      mb.className = "lookup-membership-badge " + membership.variant;
      mb.textContent = membership.text;
      header.appendChild(mb);
    }
    panel.appendChild(header);

    // Info chips
    var chips = buildProfileChips(profile);
    if (chips.length) {
      var chipRow = document.createElement("div");
      chipRow.className = "lookup-info-chips";
      chips.forEach(function (c) {
        var el = document.createElement("span");
        el.className = "lookup-info-chip";
        el.textContent = c;
        chipRow.appendChild(el);
      });
      panel.appendChild(chipRow);
    }

    // Bio
    if (profile["my-bio"]) {
      var bio = document.createElement("div");
      bio.className = "lookup-bio";
      bio.innerHTML =
        '<div class="lookup-bio-label">關於佢</div>' +
        '<div class="lookup-bio-text">' + escapeHtml(profile["my-bio"]) + "</div>";
      panel.appendChild(bio);
    }

    // Field grid (full details)
    var fields = buildProfileFields(profile);
    if (fields.length) {
      var sectTitle = document.createElement("div");
      sectTitle.className = "lookup-section-title";
      sectTitle.textContent = "📋 完整資料";
      panel.appendChild(sectTitle);

      var grid = document.createElement("div");
      grid.className = "lookup-field-grid";
      fields.forEach(function (f) {
        var cell = document.createElement("div");
        cell.className = "lookup-field";
        var lbl = document.createElement("div");
        lbl.className = "lookup-field-label";
        lbl.textContent = f.label;
        var val = document.createElement("div");
        val.className = "lookup-field-value";
        if (f.html) val.innerHTML = f.html; else val.textContent = f.value;
        cell.appendChild(lbl);
        cell.appendChild(val);
        grid.appendChild(cell);
      });
      panel.appendChild(grid);
    }

    // Match history
    var historyTitle = document.createElement("div");
    historyTitle.className = "lookup-section-title";
    historyTitle.innerHTML = "💞 配對紀錄 <span class=\"count\">(" + history.length + ")</span>";
    panel.appendChild(historyTitle);

    if (!history.length) {
      var empty = document.createElement("div");
      empty.className = "lookup-history-empty";
      empty.textContent = "暫無配對紀錄";
      panel.appendChild(empty);
    } else {
      var list = document.createElement("div");
      list.className = "lookup-history-list";
      history.forEach(function (m) { list.appendChild(buildHistoryRow(m)); });
      panel.appendChild(list);
    }
  }

  function buildHistoryRow(match) {
    var p = (match && match.partnerProfile) || {};
    var photo = p["my-photo-1"] || "";
    var status = getMatchStatus(match);
    var expanded = false;

    var row = document.createElement("button");
    row.type = "button";
    row.className = "lookup-history-row";

    var photoBox = document.createElement("div");
    photoBox.className = "lookup-history-photo";
    if (photo) {
      var img = document.createElement("img");
      img.src = photo;
      img.alt = p.name || "";
      img.loading = "lazy";
      img.addEventListener("error", function () { img.remove(); photoBox.textContent = "👤"; });
      photoBox.appendChild(img);
    } else {
      photoBox.textContent = "👤";
    }
    row.appendChild(photoBox);

    var body = document.createElement("div");
    body.className = "lookup-history-body";

    var header = document.createElement("div");
    header.className = "lookup-history-header";
    if (p.name) {
      var name = document.createElement("span");
      name.className = "lookup-history-name";
      name.textContent = p.name;
      header.appendChild(name);
    }
    if (p.instagram) {
      var handle = document.createElement("span");
      handle.className = "lookup-info-chip";
      handle.textContent = "@" + String(p.instagram).replace(/^@/, "");
      header.appendChild(handle);
    }
    if (status) {
      var s = document.createElement("span");
      s.className = "lookup-status-chip " + status.variant;
      s.textContent = status.text;
      header.appendChild(s);
    }
    body.appendChild(header);

    var chips = buildProfileChips(p);
    if (chips.length) {
      var chipRow = document.createElement("div");
      chipRow.className = "lookup-history-chips";
      chips.forEach(function (c) {
        var el = document.createElement("span");
        el.className = "lookup-info-chip";
        el.textContent = c;
        chipRow.appendChild(el);
      });
      body.appendChild(chipRow);
    }

    var time = formatMatchTime(match && match.createdAt);
    if (time) {
      var t = document.createElement("div");
      t.className = "lookup-history-time";
      t.textContent = time;
      body.appendChild(t);
    }

    var bioEl = null;
    if (p["my-bio"]) {
      bioEl = document.createElement("div");
      bioEl.className = "lookup-history-bio";
      bioEl.textContent = p["my-bio"];
      bioEl.hidden = true;
      body.appendChild(bioEl);
    }

    row.appendChild(body);

    row.addEventListener("click", function () {
      if (!bioEl) return;
      expanded = !expanded;
      bioEl.hidden = !expanded;
    });

    return row;
  }

  // Port from /dashboard/tab-history.js — match status grid.
  var MATCH_STATUS_TABLE = {
    "accept|accept":   { text: "配對成功",     variant: "matched"   },
    "accept|reject":   { text: "配對失敗",     variant: "unmatched" },
    "accept|pending":  { text: "等待對方回覆", variant: "waiting"   },
    "accept|expire":   { text: "配對失敗",     variant: "unmatched" },
    "reject|accept":   { text: "你已拒絕",     variant: "unmatched" },
    "reject|reject":   { text: "你已拒絕",     variant: "unmatched" },
    "reject|pending":  { text: "你已拒絕",     variant: "unmatched" },
    "reject|expire":   { text: "你已拒絕",     variant: "unmatched" },
    "pending|accept":  { text: "等待你的回覆", variant: "waiting"   },
    "pending|reject":  { text: "等待你的回覆", variant: "waiting"   },
    "pending|pending": { text: "等待你的回覆", variant: "waiting"   },
    "pending|expire":  { text: "等待你的回覆", variant: "waiting"   },
    "expire|accept":   { text: "配對失效",     variant: "unmatched" },
    "expire|reject":   { text: "配對失效",     variant: "unmatched" },
    "expire|pending":  { text: "配對失效",     variant: "unmatched" },
    "expire|expire":   { text: "配對失效",     variant: "unmatched" }
  };

  function normalizeStatus(s) {
    var v = String(s || "").toLowerCase();
    return v === "accept" || v === "reject" || v === "expire" ? v : "pending";
  }
  function getMatchStatus(match) {
    if (!match) return null;
    var mine = normalizeStatus(match.myStatus);
    var partner = normalizeStatus(match.partnerStatus);
    return MATCH_STATUS_TABLE[mine + "|" + partner] || null;
  }

  // membership column from n8n: "activated" → active member; "expire"/"expired"
  // → lapsed; "deactivated"/"block-match"/"force-match" → admin-set states;
  // empty → never activated. Unknown values shown as-is.
  function getMembershipBadge(profile) {
    if (!profile) return null;
    var v = String(profile.membership || "").toLowerCase();
    if (v === "activated") return { text: "會員", variant: "active" };
    if (v === "expire" || v === "expired") return { text: "會員過期", variant: "expired" };
    if (v === "deactivated") return { text: "已停用", variant: "inactive" };
    if (v === "block-match") return { text: "封鎖配對", variant: "expired" };
    if (v === "force-match") return { text: "強制配對", variant: "active" };
    if (!v) return { text: "未啟用", variant: "inactive" };
    return { text: profile.membership, variant: "inactive" };
  }

  function buildProfileChips(p) {
    if (!p) return [];
    var chips = [];
    var age = computeAgeFromDOB(p["my-age"]);
    if (age) chips.push("🎂 " + age + "歲");
    if (p["my-height"]) chips.push("📏 " + p["my-height"] + "cm");
    if (p.sex) chips.push(p.sex === "M" ? "♂ 男" : p.sex === "F" ? "♀ 女" : p.sex);
    if (p["my-occupation"]) chips.push("💼 " + p["my-occupation"]);
    if (p["my-uni"]) chips.push("🎓 " + p["my-uni"]);
    var zodiac = computeZodiacFromDOB(p["my-age"]);
    if (zodiac) chips.push(zodiac);
    if (p["my-MBTI"]) chips.push(p["my-MBTI"]);
    if (p["my-religion"]) chips.push(p["my-religion"]);
    return chips;
  }

  // Returns [{label, value} | {label, html}] for the detail grid. Empty fields
  // are skipped so mobile cards stay compact.
  function buildProfileFields(p) {
    if (!p) return [];
    var fields = [];
    function push(label, value) {
      if (value == null) return;
      if (Array.isArray(value)) {
        var joined = value.filter(Boolean).join("、");
        if (joined) fields.push({ label: label, value: joined });
        return;
      }
      var s = String(value).trim();
      if (s) fields.push({ label: label, value: s });
    }
    push("Email", p.email);
    if (p.phone) {
      fields.push({ label: "電話", html: '<a href="tel:' + escapeHtml(String(p.phone)) + '">' + escapeHtml(String(p.phone)) + "</a>" });
    }
    push("性別", p.sex === "M" ? "男" : p.sex === "F" ? "女" : p.sex);
    push("性取向", p["sexual-orientation"]);
    push("出生日期", p["my-age"]);
    push("身高", p["my-height"] ? p["my-height"] + " cm" : "");
    push("職業", p["my-occupation"]);
    push("大學", p["my-uni"]);
    push("MBTI", p["my-MBTI"]);
    push("愛之語", p["my-love-language"]);
    push("飲酒習慣", p["my-drinking-habbit"]);
    push("吸煙習慣", p["my-smoking-habbit"]);
    push("宗教", p["my-religion"]);
    push("生育意願", p["my-kids-expectation"]);
    push("興趣", p["my-hobby"]);
    push("活動", p["my-activities"]);
    push("其他活動", p["my-activities-others"]);
    return fields;
  }

  function computeAgeFromDOB(dob) {
    if (!dob) return null;
    var d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    var now = new Date();
    var age = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age > 0 && age < 120 ? age : null;
  }

  function computeZodiacFromDOB(dob) {
    if (!dob) return null;
    var d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var signs = [
      [1, 20, "♑ 摩羯座"], [2, 19, "♒ 水瓶座"], [3, 21, "♓ 雙魚座"],
      [4, 20, "♈ 白羊座"], [5, 21, "♉ 金牛座"], [6, 22, "♊ 雙子座"],
      [7, 23, "♋ 巨蟹座"], [8, 23, "♌ 獅子座"], [9, 23, "♍ 處女座"],
      [10, 24, "♎ 天秤座"], [11, 23, "♏ 天蝍座"], [12, 22, "♐ 射手座"],
      [12, 31, "♑ 摩羯座"]
    ];
    for (var i = 0; i < signs.length; i++) {
      var m = signs[i][0], dmax = signs[i][1], name = signs[i][2];
      if (month < m || (month === m && day <= dmax)) return name;
    }
    return null;
  }

  function formatMatchTime(raw) {
    if (!raw) return "";
    var d = new Date(raw);
    if (isNaN(d.getTime())) {
      var m = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) d = new Date(m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"));
    }
    if (isNaN(d.getTime())) return String(raw);
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 配對";
  }

  function openPhotoModal(src) {
    var modalBody = previewModal.querySelector(".admin-modal-body");
    modalBody.innerHTML = '<img class="lookup-photo-modal-img" alt="" />';
    modalBody.querySelector("img").src = src;
    previewModal.hidden = false;
  }

  // ============================================================
  // Follow-up tab — who to chase: people whose own reply is still
  // "pending" inside a match that hasn't expired (overall status = pending).
  // n8n returns the matchesGrid rows (incl. instagram + phone per side).
  // ============================================================
  var FOLLOWUP_IG_KEYS = ["instagram", "ig", "instagram-username", "ig-username", "instagram-handle", "username", "handle"];
  var FOLLOWUP_PHONE_KEYS = ["phone", "phone-number", "phonenumber", "tel", "mobile", "whatsapp", "contact"];
  var followupLoaded = false;

  function loadFollowups() {
    var token = getToken();
    if (!token) { showLogin(); return; }

    followupLoadBtn.disabled = true;
    followupLoadBtn.textContent = "載入中…";
    followupState.hidden = false;
    followupState.textContent = "載入中…";
    if (!followupLoaded) followupContent.hidden = true;

    fetch(window.webhookUrl("follow-up-list"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: token })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { handleAuthError(); throw new Error("auth"); }
        return parseJsonSafe(r);
      })
      .then(function (data) {
        var people = buildFollowupList(normalizeMatchRows(data));
        renderFollowups(people);
        followupState.hidden = true;
        followupContent.hidden = false;
        followupLoaded = true;
      })
      .catch(function (e) {
        if (e && e.message === "auth") return;
        followupState.hidden = false;
        followupState.textContent = "載入失敗，請重試。";
      })
      .then(function () {
        followupLoadBtn.disabled = false;
        followupLoadBtn.textContent = "🔄 重新整理";
      });
  }

  // Accept a bare rows array, { matches | results | data | rows: [...] }, or
  // n8n's 1-element "Respond to Webhook" wrapper around any of those.
  function normalizeMatchRows(data) {
    if (Array.isArray(data) && data.length === 1 && data[0] && typeof data[0] === "object" &&
        !data[0].status && !data[0]["a-status"]) {
      data = data[0];
    }
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.matches)) return data.matches;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.rows)) return data.rows;
    return [];
  }

  function pickSideField(row, side, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = row[side + "-" + keys[i]];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  }

  function buildFollowupList(rows) {
    var people = [];
    var seen = {};
    rows.forEach(function (row) {
      if (!row || typeof row !== "object") return;
      if (String(row.status || "").trim().toLowerCase() !== "pending") return;
      [["a", "b"], ["b", "a"]].forEach(function (pair) {
        var me = pair[0], partner = pair[1];
        if (String(row[me + "-status"] || "").trim().toLowerCase() !== "pending") return;
        // Skip dead-end matches: if the partner already rejected/expired, no
        // reply from this person can produce a match, so chasing is wasted.
        var partnerStatus = String(row[partner + "-status"] || "").trim().toLowerCase();
        if (partnerStatus === "reject" || partnerStatus === "expire") return;
        var email = String(row["email-" + me] || "").trim();
        var key = email.toLowerCase();
        if (key) { if (seen[key]) return; seen[key] = true; }
        people.push({
          name: String(row[me + "-name"] || "").trim(),
          email: email,
          instagram: pickSideField(row, me, FOLLOWUP_IG_KEYS).replace(/^@/, ""),
          phone: pickSideField(row, me, FOLLOWUP_PHONE_KEYS),
          partnerName: String(row[partner + "-name"] || "").trim(),
          partnerStatus: partnerStatus,
          createdAt: row["created-at"] || row.createdAt || ""
        });
      });
    });
    // Oldest matches first — those are closest to expiring, chase them first.
    people.sort(function (a, b) {
      return parseFollowupDate(a.createdAt) - parseFollowupDate(b.createdAt);
    });
    return people;
  }

  // Slash dates are Day/Month/Year here, matching the rest of admin.js.
  function parseFollowupDate(raw) {
    if (!raw) return Number.MAX_SAFE_INTEGER;
    var s = String(raw).trim();
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(am|pm)?)?/i);
    if (m) {
      var day = +m[1], month = +m[2], year = +m[3];
      var hr = m[4] ? +m[4] : 0, min = m[5] ? +m[5] : 0;
      var ap = (m[6] || "").toLowerCase();
      if (ap === "pm" && hr < 12) hr += 12;
      if (ap === "am" && hr === 12) hr = 0;
      return new Date(year, month - 1, day, hr, min).getTime();
    }
    var t = new Date(s).getTime();
    return isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  }

  function renderFollowups(people) {
    followupListEl.innerHTML = "";
    if (!people.length) {
      followupSummary.innerHTML = "";
      followupListEl.innerHTML =
        '<div class="admin-posts-state">🎉 暫時冇人需要跟進，全部都回咗覆喇。</div>';
      return;
    }
    var hot = people.filter(function (p) { return p.partnerStatus === "accept"; }).length;
    followupSummary.innerHTML =
      '<span class="followup-count">' + people.length + " 位需要跟進</span>" +
      (hot ? '<span class="followup-count-hot">🔥 ' + hot + " 位對方已接受</span>" : "");
    people.forEach(function (p) { followupListEl.appendChild(buildFollowupCard(p)); });
  }

  function buildFollowupCard(p) {
    var card = document.createElement("div");
    card.className = "followup-card" + (p.partnerStatus === "accept" ? " hot" : "");

    var head = document.createElement("div");
    head.className = "followup-card-head";
    var name = document.createElement("span");
    name.className = "followup-name";
    name.textContent = p.name || "(未有名稱)";
    head.appendChild(name);

    var badge = document.createElement("span");
    if (p.partnerStatus === "accept") {
      badge.className = "followup-badge hot";
      badge.textContent = "🔥 對方已接受";
    } else if (p.partnerStatus === "pending") {
      badge.className = "followup-badge wait";
      badge.textContent = "雙方未回覆";
    } else {
      badge.className = "followup-badge";
      badge.textContent = "等緊佢回覆";
    }
    head.appendChild(badge);
    card.appendChild(head);

    var metaBits = [];
    if (p.partnerName) metaBits.push("配對對象：" + p.partnerName);
    var t = formatMatchTime(p.createdAt);
    if (t) metaBits.push(t);
    if (metaBits.length) {
      var meta = document.createElement("div");
      meta.className = "followup-meta";
      meta.textContent = metaBits.join(" · ");
      card.appendChild(meta);
    }

    var contacts = document.createElement("div");
    contacts.className = "followup-contacts";
    if (p.instagram) contacts.appendChild(makeCopyChip("IG", "@" + p.instagram, p.instagram));
    if (p.phone) contacts.appendChild(makeCopyChip("電話", p.phone, p.phone));
    if (p.email) contacts.appendChild(makeCopyChip("Email", p.email, p.email));
    if (p.instagram) {
      var ig = document.createElement("a");
      ig.className = "followup-iglink";
      ig.href = "https://instagram.com/" + encodeURIComponent(p.instagram);
      ig.target = "_blank";
      ig.rel = "noopener";
      ig.textContent = "開 IG ↗";
      contacts.appendChild(ig);
    }
    if (!p.instagram && !p.phone && !p.email) {
      var none = document.createElement("span");
      none.className = "followup-nocontact";
      none.textContent = "⚠️ 冇聯絡資料";
      contacts.appendChild(none);
    }
    card.appendChild(contacts);

    return card;
  }

  function makeCopyChip(label, display, copyValue) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "followup-copy";
    btn.innerHTML =
      '<span class="followup-copy-label">' + escapeHtml(label) + "</span>" +
      '<span class="followup-copy-val">' + escapeHtml(display) + "</span>" +
      '<span class="followup-copy-icon">📋</span>';
    btn.addEventListener("click", function () { copyToClipboard(copyValue, btn); });
    return btn;
  }

  function copyToClipboard(text, btn) {
    function flash() {
      btn.classList.add("copied");
      var icon = btn.querySelector(".followup-copy-icon");
      if (icon) icon.textContent = "✓";
      toast("已複製：" + text);
      clearTimeout(btn._copyT);
      btn._copyT = setTimeout(function () {
        btn.classList.remove("copied");
        if (icon) icon.textContent = "📋";
      }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flash, function () { legacyCopy(text); flash(); });
    } else {
      legacyCopy(text);
      flash();
    }
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (e) { /* clipboard unavailable */ }
  }

  // ============================================================
  // Dashboard tab
  // ============================================================
  var DASH_PALETTE = [
    "#FF6EB4", "#A259FF", "#9060E0", "#5B2EAA", "#4DB6AC",
    "#FFB300", "#7E57C2", "#FF8A65", "#5B9BD5", "#AED581",
    "#F06292", "#BA68C8", "#4FC3F7", "#FFD54F", "#81C784"
  ];

  function loadDashboard() {
    var token = getToken();
    if (!token) { showLogin(); return; }

    dashboardState.hidden = false;
    dashboardState.textContent = "載入中…";
    if (!dashboardLoaded) dashboardContent.hidden = true;
    setBusy(dashboardRefresh, "…");

    fetch(window.webhookUrl("dashboard-data"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminToken: token })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { handleAuthError(); throw new Error("auth"); }
        return parseJsonSafe(r);
      })
      .then(function (data) {
        renderDashboard(data || {});
        dashboardState.hidden = true;
        dashboardContent.hidden = false;
        dashboardLoaded = true;
      })
      .catch(function (e) {
        if (e && e.message === "auth") return;
        dashboardState.hidden = false;
        dashboardState.textContent = "載入失敗，請重試。";
      })
      .then(function () { unsetBusy(dashboardRefresh, "🔄"); });
  }

  // ── Aggregation ──
  function parseAge(dob) {
    var m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(dob || ""));
    if (!m) return null;
    var now = new Date();
    var age = now.getFullYear() - parseInt(m[3], 10);
    var bMonth = parseInt(m[2], 10), bDay = parseInt(m[1], 10);
    if (now.getMonth() + 1 < bMonth || (now.getMonth() + 1 === bMonth && now.getDate() < bDay)) age--;
    return (age > 0 && age < 120) ? age : null;
  }
  function parseCharge(s) {
    var m = /\$\s*(\d+)/.exec(String(s || ""));
    return m ? parseInt(m[1], 10) : 0;
  }
  function parseTouchpoint(s) {
    s = (s || "").trim();
    if (!s) return [];
    try {
      var arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(function (x) { return String(x).trim(); }).filter(Boolean);
    } catch (e) { /* fall through */ }
    return [s];
  }
  function isFemale(sex) { return String(sex || "").indexOf("女") !== -1; }
  function isMale(sex) { return String(sex || "").indexOf("男") !== -1; }

  function countBy(arr, keyFn) {
    var m = {};
    arr.forEach(function (x) {
      var k = keyFn(x);
      if (k === null || k === undefined || k === "") return;
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }
  function topN(map, n) {
    var pairs = Object.keys(map).map(function (k) { return [k, map[k]]; });
    pairs.sort(function (a, b) { return b[1] - a[1]; });
    return n ? pairs.slice(0, n) : pairs;
  }

  function aggMembers(members) {
    var total = members.length;
    var active = members.filter(function (m) { return m.membership === "activated"; }).length;
    var male = members.filter(function (m) { return isMale(m.sex); }).length;
    var female = members.filter(function (m) { return isFemale(m.sex); }).length;

    var ageOrder = ["<25", "25-29", "30-34", "35-39", "40+"];
    var ageBuckets = { "<25": 0, "25-29": 0, "30-34": 0, "35-39": 0, "40+": 0 };
    members.forEach(function (m) {
      var a = parseAge(m["my-age"]);
      if (a === null) return;
      if (a < 25) ageBuckets["<25"]++;
      else if (a < 30) ageBuckets["25-29"]++;
      else if (a < 35) ageBuckets["30-34"]++;
      else if (a < 40) ageBuckets["35-39"]++;
      else ageBuckets["40+"]++;
    });

    var touch = {};
    members.forEach(function (m) {
      parseTouchpoint(m.touchpoint).forEach(function (t) { touch[t] = (touch[t] || 0) + 1; });
    });

    var signups = {};
    members.forEach(function (m) {
      var s = String(m["Submitted at"] || "");
      var mm = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
      if (!mm) return;
      var key = mm[3] + "-" + String(parseInt(mm[2], 10)).padStart(2, "0");
      signups[key] = (signups[key] || 0) + 1;
    });

    return {
      total: total, active: active, male: male, female: female,
      ageOrder: ageOrder, ageBuckets: ageBuckets,
      occupation: countBy(members, function (m) { return (m["my-occupation"] || "").trim(); }),
      mbti: countBy(members, function (m) { return (m["my-MBTI"] || "").trim(); }),
      face: countBy(members, function (m) { return (m["face-rating"] || "").trim(); }),
      membership: countBy(members, function (m) { return (m.membership || "").trim(); }),
      touchpoint: touch,
      signups: signups
    };
  }

  function aggMatches(matches) {
    var resp = { accept: 0, reject: 0, expire: 0, pending: 0 };
    var mutual = 0, atLeastOneAccept = 0;
    var outcomes = { mutual: 0, oneAcceptOneExpire: 0, anyReject: 0, bothExpire: 0, awaiting: 0 };

    matches.forEach(function (mt) {
      var a = (mt["a-status"] || "").trim();
      var b = (mt["b-status"] || "").trim();
      [a, b].forEach(function (s) { if (resp.hasOwnProperty(s)) resp[s]++; });

      var set = [a, b];
      var hasAccept = set.indexOf("accept") !== -1;
      var hasReject = set.indexOf("reject") !== -1;
      var hasPending = set.indexOf("pending") !== -1;

      if (hasAccept) atLeastOneAccept++;
      if (a === "accept" && b === "accept") { mutual++; outcomes.mutual++; }
      else if (hasReject) outcomes.anyReject++;
      else if (hasAccept && set.indexOf("expire") !== -1) outcomes.oneAcceptOneExpire++;
      else if (a === "expire" && b === "expire") outcomes.bothExpire++;
      else if (hasPending) outcomes.awaiting++;
    });

    var decided = resp.accept + resp.reject + resp.expire;
    var responseRate = decided ? Math.round(100 * (resp.accept + resp.reject) / decided) : 0;
    var mutualRate = matches.length ? Math.round(1000 * mutual / matches.length) / 10 : 0;

    return {
      total: matches.length, resp: resp, mutual: mutual, atLeastOneAccept: atLeastOneAccept,
      outcomes: outcomes, responseRate: responseRate, mutualRate: mutualRate
    };
  }

  function classifyPayment(p) {
    p = (p || "").trim().toLowerCase();
    if (p === "received" || p.indexOf("paid") !== -1) return "confirmed";
    if (p.indexOf("withdraw") !== -1) return "withdrawn";
    return "arranging";
  }
  function eventActivity(s) {
    s = (s || "").trim();
    if (!s) return "";
    if (s.toLowerCase().indexOf("exchanged ig") !== -1) return "IG 交換";
    var word = s.split("$")[0].trim();
    return word || s;
  }
  function isIgOnly(ev) {
    return eventActivity(ev["Event and Charge Per head"]) === "IG 交換";
  }
  function paymentHeads(p) {
    p = (p || "").trim().toLowerCase();
    if (p === "received") return 2;
    if (p.indexOf("paid") !== -1) return 1;
    return 0;
  }

  function aggEvents(events) {
    var dates = events.filter(function (e) { return !isIgOnly(e); });
    var confirmed = 0, withdrawn = 0, arranging = 0, revenue = 0;
    dates.forEach(function (e) {
      var c = classifyPayment(e["Payment Status"]);
      if (c === "confirmed") confirmed++;
      else if (c === "withdrawn") withdrawn++;
      else arranging++;
      revenue += parseCharge(e["Event and Charge Per head"]) * paymentHeads(e["Payment Status"]);
    });

    return {
      total: events.length,
      datesArranged: dates.length,
      confirmed: confirmed, withdrawn: withdrawn, arranging: arranging, revenue: revenue,
      payment: countBy(events, function (e) {
        var p = (e["Payment Status"] || "").trim();
        return p || "（待安排）";
      }),
      activity: countBy(events, function (e) { return eventActivity(e["Event and Charge Per head"]); }),
      stage: countBy(events, function (e) { return (e.Status || "").trim(); })
    };
  }

  // ── Render ──
  function destroyDashboardCharts() {
    dashboardCharts.forEach(function (c) { try { c.destroy(); } catch (e) { /* noop */ } });
    dashboardCharts = [];
  }

  function makeChart(canvasId, config) {
    var canvas = $(canvasId);
    if (!canvas) return;
    var c = new window.Chart(canvas.getContext("2d"), config);
    dashboardCharts.push(c);
  }

  function donut(canvasId, labels, values, colors) {
    makeChart(canvasId, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors || DASH_PALETTE, borderWidth: 2, borderColor: "#fff" }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "58%",
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });
  }

  function bar(canvasId, labels, values, opts) {
    opts = opts || {};
    makeChart(canvasId, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: opts.colors || "#A259FF", borderRadius: 6, maxBarThickness: 38 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: opts.horizontal ? "y" : "x",
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: !opts.horizontal }, ticks: { font: { size: 11 }, precision: 0 } },
          y: { grid: { display: !!opts.horizontal }, ticks: { font: { size: 11 }, precision: 0 } }
        }
      }
    });
  }

  function line(canvasId, labels, values) {
    makeChart(canvasId, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          data: values, borderColor: "#A259FF", backgroundColor: "rgba(162,89,255,0.12)",
          fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: "#A259FF"
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } }
      }
    });
  }

  function kpiCard(value, label, sub, accent) {
    return '<div class="dash-kpi-card' + (accent ? " accent" : "") + '">' +
      '<div class="dash-kpi-value">' + escapeHtml(String(value)) + "</div>" +
      '<div class="dash-kpi-label">' + escapeHtml(label) + "</div>" +
      (sub ? '<div class="dash-kpi-sub">' + escapeHtml(sub) + "</div>" : "") +
      "</div>";
  }

  function funnelRow(label, value, max, isEvents) {
    var pct = max > 0 ? Math.max(4, Math.round(100 * value / max)) : 4;
    return '<div class="dash-funnel-row' + (isEvents ? " is-events" : "") + '">' +
      '<div class="dash-funnel-label">' + escapeHtml(label) + "</div>" +
      '<div class="dash-funnel-bar-wrap">' +
      '<div class="dash-funnel-bar" style="width:' + pct + '%">' + value + "</div>" +
      "</div></div>";
  }

  function renderDashboard(data) {
    destroyDashboardCharts();

    var members = Array.isArray(data.members) ? data.members : [];
    var matches = Array.isArray(data.matches) ? data.matches : [];
    var events = Array.isArray(data.events) ? data.events : [];

    var M = aggMembers(members);
    var X = aggMatches(matches);
    var E = aggEvents(events);

    // ── Section A: KPI cards ──
    dashKpis.innerHTML = [
      kpiCard(M.total, "總會員", M.male + " 男 · " + M.female + " 女"),
      kpiCard(M.active, "生效會員", M.total ? Math.round(100 * M.active / M.total) + "% 生效中" : ""),
      kpiCard(X.total, "總配對數", ""),
      kpiCard(X.responseRate + "%", "回覆率", "不計 pending"),
      kpiCard(X.mutual, "雙方接受", X.mutualRate + "% 配對成功", true),
      kpiCard(E.datesArranged, "安排約會", E.arranging + " 安排中 · " + E.withdrawn + " 退出"),
      kpiCard(E.confirmed, "已確認/付款", "", true),
      kpiCard("$" + E.revenue.toLocaleString(), "估算收入", "已付款活動")
    ].join("");

    $("dash-funnel-note").textContent =
      "註：「雙方接受」只代表雙方喺配對階段都揀咗對方，未必真正出到嚟見面。實際約會以「活動」資料為準 —— 部分人接受後失聯或中途退出。配對與活動係兩份獨立資料，並非一對一對應。";

    // ── Guard: Chart.js available? ──
    if (!window.Chart) {
      var note = document.createElement("div");
      note.className = "dash-note";
      note.textContent = "圖表程式庫載入失敗（請檢查網絡），但上方數字仍然可用。";
      dashKpis.insertAdjacentElement("afterend", note);
      renderFunnel(X, E);
      return;
    }

    // ── Section C: funnel + engagement ──
    renderFunnel(X, E);

    donut("dash-response",
      ["接受", "拒絕", "未回覆 (expire)", "等待中"],
      [X.resp.accept, X.resp.reject, X.resp.expire, X.resp.pending],
      ["#4CAF50", "#e53e3e", "#bdbdbd", "#FFB300"]);

    bar("dash-outcome",
      ["雙方接受", "一接受一未覆", "至少一拒絕", "雙方未覆", "等待中"],
      [X.outcomes.mutual, X.outcomes.oneAcceptOneExpire, X.outcomes.anyReject, X.outcomes.bothExpire, X.outcomes.awaiting],
      { colors: ["#4CAF50", "#AED581", "#e53e3e", "#bdbdbd", "#FFB300"] });

    // ── Section B: demographics ──
    donut("dash-gender", ["男性", "女性"], [M.male, M.female], ["#5B9BD5", "#FF6EB4"]);
    donut("dash-membership",
      topN(M.membership).map(function (p) { return p[0]; }),
      topN(M.membership).map(function (p) { return p[1]; }),
      ["#4CAF50", "#bdbdbd", "#FFB300", "#7E57C2"]);
    bar("dash-age", M.ageOrder, M.ageOrder.map(function (k) { return M.ageBuckets[k]; }), { colors: "#A259FF" });
    bar("dash-face", ["A", "B", "C", "D", "E"], ["A", "B", "C", "D", "E"].map(function (k) { return M.face[k] || 0; }),
      { colors: ["#FF6EB4", "#A259FF", "#9060E0", "#7E57C2", "#5B2EAA"] });

    var occ = topN(M.occupation, 10);
    bar("dash-occupation", occ.map(function (p) { return p[0]; }), occ.map(function (p) { return p[1]; }),
      { horizontal: true, colors: "#9060E0" });

    var mbti = topN(M.mbti, 12);
    bar("dash-mbti", mbti.map(function (p) { return p[0]; }), mbti.map(function (p) { return p[1]; }),
      { horizontal: true, colors: "#A259FF" });

    var tp = topN(M.touchpoint);
    if (tp.length) {
      donut("dash-touchpoint", tp.map(function (p) { return p[0]; }), tp.map(function (p) { return p[1]; }));
    }

    var sKeys = Object.keys(M.signups).sort();
    line("dash-signups", sKeys, sKeys.map(function (k) { return M.signups[k]; }));

    // ── Section D: events & revenue ──
    var pay = topN(E.payment);
    donut("dash-payment", pay.map(function (p) { return p[0]; }), pay.map(function (p) { return p[1]; }));
    var act = topN(E.activity);
    bar("dash-activity", act.map(function (p) { return p[0]; }), act.map(function (p) { return p[1]; }), { colors: "#4DB6AC" });
    var stg = topN(E.stage);
    bar("dash-stage", stg.map(function (p) { return p[0]; }), stg.map(function (p) { return p[1]; }),
      { horizontal: true, colors: "#7E57C2" });
  }

  function renderFunnel(X, E) {
    var maxMatch = X.total || 1;
    var html =
      '<div class="dash-funnel-divider">— 配對階段（配對資料）—</div>' +
      funnelRow("已配對", X.total, maxMatch, false) +
      funnelRow("至少一方接受", X.atLeastOneAccept, maxMatch, false) +
      funnelRow("雙方接受", X.mutual, maxMatch, false) +
      '<div class="dash-funnel-divider">— 約會階段（活動資料）—</div>' +
      funnelRow("安排約會", E.datesArranged, maxMatch, true) +
      funnelRow("已確認/付款", E.confirmed, maxMatch, true);
    $("dash-funnel").innerHTML = html;
    $("dash-funnel-foot").textContent =
      "活動階段：" + E.datesArranged + " 個約會安排中，當中 " + E.confirmed +
      " 個已確認/付款、" + E.withdrawn + " 個中途退出。";
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
