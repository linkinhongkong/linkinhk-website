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
  var submitMembersBtn = $("admin-submit-members-btn");

  // Lookup tab
  var lookupInput = $("lookup-input");
  var lookupPreview = $("lookup-preview");
  var lookupResults = $("lookup-results");
  var lookupSearchBtn = $("admin-search-members-btn");

  // ── State ──
  var bodyBlocks = []; // [{type:'p'|'h2'|'h3'|'quote', text:string} | {type:'list', items:string[]}]
  var slugManuallyEdited = false;
  var activitiesData = { question: { label: "", hint: "" }, items: [] };
  var lookupState = { activeHandle: null, results: [] };

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
    memberInput.addEventListener("input", renderMemberPreview);
    submitMembersBtn.addEventListener("click", submitMembers);

    // Lookup tab
    lookupInput.addEventListener("input", renderLookupPreview);
    lookupSearchBtn.addEventListener("click", searchMembers);

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
  // Lookup tab
  // ============================================================
  function renderLookupPreview() {
    var handles = parseHandles(lookupInput.value);
    lookupPreview.innerHTML = handles
      .map(function (h) { return '<span class="admin-chip">@' + escapeHtml(h) + "</span>"; })
      .join("");
  }

  function searchMembers() {
    var handles = parseHandles(lookupInput.value);
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
