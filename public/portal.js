const TOKEN_KEY = "bts-field-token";
const MARK = `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#14181d"/><circle cx="32" cy="32" r="28" fill="#e0a100"/><path d="M16 27 22 12l7 12zM48 27 42 12l-7 12z" fill="#1a1d22"/><ellipse cx="32" cy="35" rx="15" ry="13" fill="#f3d48a"/><ellipse cx="26" cy="34" rx="2" ry="2.3" fill="#1a1d22"/><ellipse cx="38" cy="34" rx="2" ry="2.3" fill="#1a1d22"/></svg>`;

let token = sessionStorage.getItem(TOKEN_KEY) || "";
let officerId = "";
let portal = null;
let tab = "duty";
let tabReady = false;
let knownJobId;
let fieldMap = null;
let busy = false;
let refreshGen = 0;
let toastTimer = 0;
let sheetOpen = false;
const draft = { report: "", note: "", reason: "" };

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function statusClass(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "");
}

function pill(status) {
  return `<span class="pill ${statusClass(status)}">${esc(status)}</span>`;
}

function phoneHref(value) {
  return `tel:${String(value || "").replace(/[^\d+]/g, "")}`;
}

function captureDrafts() {
  const report = document.getElementById("report");
  const note = document.getElementById("radio-input");
  const reason = document.getElementById("reason");
  if (report) draft.report = report.value;
  if (note) draft.note = note.value;
  if (reason) draft.reason = reason.value;
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
}

function destroyMap() {
  if (fieldMap) {
    fieldMap.remove();
    fieldMap = null;
  }
}

function authHeaders(extra) {
  return { ...(extra || {}), Authorization: `Bearer ${token}` };
}

function signOut() {
  const current = token;
  token = "";
  officerId = "";
  portal = null;
  tabReady = false;
  knownJobId = undefined;
  sheetOpen = false;
  sessionStorage.removeItem(TOKEN_KEY);
  fetch("/api/logout", { method: "POST", headers: { Authorization: `Bearer ${current}` } }).catch(() => {});
  render();
}

async function restoreSession() {
  const response = await fetch("/api/session", { headers: authHeaders() });
  if (!response.ok) {
    token = "";
    sessionStorage.removeItem(TOKEN_KEY);
    return false;
  }
  const payload = await response.json();
  if (!payload.account || payload.account.role !== "responder") return false;
  officerId = payload.account.responderId;
  return true;
}

async function fetchPortal() {
  const response = await fetch(`/api/field/${encodeURIComponent(officerId)}`, { headers: authHeaders() });
  const payload = await response.json();
  if (response.status === 401) {
    signOut();
    throw new Error("Sign in required.");
  }
  if (!response.ok) throw new Error(payload.error || "This officer account could not be opened.");
  return payload;
}

function applyPortal(payload) {
  const nextJob = payload.job ? payload.job.id : null;
  if (!tabReady) {
    tab = payload.job ? "job" : "duty";
    tabReady = true;
  } else if (nextJob && nextJob !== knownJobId) {
    tab = "job";
    toast(`Dispatch: ${payload.job.client}`);
  } else if (knownJobId && !nextJob) {
    tab = "duty";
    toast("Control room cleared this job.");
  }
  knownJobId = nextJob;
  portal = payload;
}

async function post(path, body) {
  refreshGen += 1;
  const response = await fetch(path, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {})
  });
  const payload = await response.json();
  if (response.status === 401) {
    signOut();
    throw new Error("Sign in required.");
  }
  if (!response.ok || payload.ok === false) throw new Error(payload.error || "Request failed.");
  if (payload.portal) {
    knownJobId = payload.portal.job ? payload.portal.job.id : null;
    portal = payload.portal;
  }
  return payload;
}

function shell(body) {
  const responder = portal.responder;
  const offline = portal.controlRoom && portal.controlRoom.online === false;
  const jobDot = portal.job && tab !== "job" ? `<i class="dot-job"></i>` : "";
  return `
    <header class="top">
      ${MARK}
      <div class="brand">BLACK TIGER<span>FIELD</span></div>
      <div class="who"><strong>${esc(responder.name)}</strong><small>${esc(responder.id)} · ${esc(responder.location)}</small></div>
    </header>
    <div class="screen" id="screen">
      ${offline ? `<p class="banner off">Control room is offline. Keep the scene safe and call the duty number.</p>` : ""}
      ${body}
    </div>
    <nav class="tabs" aria-label="Field portal">
      <button type="button" data-tab="duty" class="${tab === "duty" ? "is-on" : ""}" ${tab === "duty" ? "aria-current=\"page\"" : ""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" fill="currentColor"/><path fill="currentColor" d="M6 19c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5z"/></svg>
        Duty
      </button>
      <button type="button" data-tab="job" class="${tab === "job" ? "is-on" : ""}" ${tab === "job" ? "aria-current=\"page\"" : ""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6zm0 8.2A2.2 2.2 0 1 1 14.2 9 2.2 2.2 0 0 1 12 11.2z"/></svg>
        Job${jobDot}
      </button>
      <button type="button" data-tab="radio" class="${tab === "radio" ? "is-on" : ""}" ${tab === "radio" ? "aria-current=\"page\"" : ""}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 5h14v10H8l-3 3z"/></svg>
        Radio
      </button>
    </nav>
    <div id="sheet" class="sheet" ${sheetOpen ? "" : "hidden"}>
      <form class="sheet-card" id="release-form">
        <h3>Stand down</h3>
        <p>Control room will see the reason and can send another officer.</p>
        <label for="reason">Reason</label>
        <textarea id="reason" name="reason" maxlength="280" required>${esc(draft.reason)}</textarea>
        <p id="sheet-error" class="form-error" hidden></p>
        <div class="actions">
          <button type="submit" class="btn btn-red">Confirm stand down</button>
          <button type="button" class="btn btn-ghost" id="sheet-cancel">Cancel</button>
        </div>
      </form>
    </div>`;
}

function renderLogin() {
  destroyMap();
  document.getElementById("phone").innerHTML = `
    <div class="screen gate">
      <header class="top" style="margin:-14px -14px 16px;border-radius:0">
        ${MARK}
        <div class="brand">BLACK TIGER<span>FIELD</span></div>
      </header>
      <h1>Responder sign-in</h1>
      <p class="lead">Field officers use this phone app. The control room is the desktop desk.</p>
      <form id="field-login" class="login-form">
        <label for="field-username">Username</label>
        <input id="field-username" name="username" autocomplete="username" required>
        <label for="field-password">Password</label>
        <input id="field-password" name="password" type="password" autocomplete="current-password" required>
        <p id="login-error" class="form-error" hidden></p>
        <button type="submit" class="btn btn-gold">Sign in</button>
      </form>
      <p class="lead">Sample officer: <strong>r3</strong> / <strong>tiger</strong></p>
      <p class="desk-link"><a href="/client">Client app</a> · <a href="/">Control room</a></p>
    </div>`;
}

function renderDuty() {
  const responder = portal.responder;
  const width = Math.max(0, Math.min(100, Number(responder.battery) || 0));
  const onJob = Boolean(portal.job);
  const dutyLabel = responder.status === "Off Duty" ? "Go available" : "Go off duty";
  const dutyNext = responder.status === "Off Duty" ? "Available" : "Off Duty";
  const history = portal.history.length
    ? portal.history.map((item) => `<li><span><strong>${esc(item.client)}</strong><small>${esc(item.type)} · ${esc(item.resolution)}</small></span><small>${esc(item.time)}</small></li>`).join("")
    : `<li><span class="empty">No scene reports on this handset yet.</span></li>`;
  return `
    <section class="stack">
      <article class="hero">
        <div class="hero-row">
          <div>
            <p class="kicker">Duty status</p>
            <h1>${esc(responder.status)}</h1>
          </div>
          ${pill(responder.status)}
        </div>
        <div class="batt ${width < 40 ? "low" : ""}"><span style="width:${width}%"></span></div>
        <div class="meta">
          <div>Battery<strong>${width}%</strong></div>
          <div>Location<strong>${esc(responder.location)}</strong></div>
        </div>
        <div class="actions">
          <button type="button" class="btn ${responder.status === "Off Duty" ? "btn-gold" : "btn-ghost"}" data-action="duty" data-status="${esc(dutyNext)}" ${onJob ? "disabled" : ""}>${onJob ? "On a job" : dutyLabel}</button>
          <button type="button" class="btn btn-ghost" data-action="sign-out">Sign out</button>
        </div>
      </article>
      ${portal.job ? `<article class="card"><h2>Current job</h2><p>${esc(portal.job.client)} · ${esc(portal.job.type)}</p><div class="actions"><button type="button" class="btn btn-gold" data-tab="job">Open job</button></div></article>` : `<article class="card"><h2>Standing by</h2><p>New dispatches from the Nelspruit control room appear on the Job tab.</p></article>`}
      <article class="card">
        <h2>Your reports</h2>
        <ul class="feed history">${history}</ul>
      </article>
    </section>`;
}

function renderJob() {
  const job = portal.job;
  const responder = portal.responder;
  if (!job) {
    return `<article class="card"><h2>No job assigned</h2><p>${esc(responder.name)} is ${esc(responder.status.toLowerCase())} in ${esc(responder.location)}. The control room will send the next alarm here.</p></article>`;
  }
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${job.lat},${job.lng}`)}`;
  const arrived = responder.status === "On Scene";
  return `
    <section class="stack">
      <article class="card job">
        <header>${pill(job.priority)} ${pill(job.status)}</header>
        <h2>${esc(job.type)}</h2>
        <p class="addr">${esc(job.client)}<br>${esc(job.address)}</p>
        <div class="facts">
          <span>When</span><strong>${esc(job.time)} (${esc(job.when)})</strong>
          <span>Distance</span><strong>${Number(job.distanceKm).toFixed(1)} km</strong>
          <span>Plan</span><strong>${esc(job.plan || "—")}</strong>
          <span>Phone</span><strong>${job.phone ? `<a href="${esc(phoneHref(job.phone))}">${esc(job.phone)}</a>` : "—"}</strong>
        </div>
        <div class="btn-row actions">
          ${job.phone ? `<a class="btn btn-ghost" href="${esc(phoneHref(job.phone))}">Call client</a>` : `<span></span>`}
          <a class="btn btn-ghost" href="${esc(maps)}" target="_blank" rel="noopener">Directions</a>
        </div>
      </article>
      <article class="card">
        ${arrived ? `
          <label for="report">Scene report</label>
          <textarea id="report" maxlength="400" placeholder="What you found and what you did">${esc(draft.report)}</textarea>
          <p id="report-error" class="form-error" hidden></p>
          <div class="actions"><button type="button" class="btn btn-gold" data-action="complete">File report and clear</button></div>
        ` : `
          <p>You are en route. Mark arrival when you reach the client.</p>
          <div class="actions">
            <button type="button" class="btn btn-gold" data-action="arrive">I've arrived</button>
            <button type="button" class="btn btn-ghost" data-action="ping">Update GPS</button>
          </div>
        `}
        <div class="actions"><button type="button" class="btn btn-ghost" data-action="stand-down">Stand down</button></div>
      </article>
      <div id="job-map" class="map"></div>
    </section>`;
}

function renderRadio() {
  const items = portal.radio.length
    ? portal.radio.map((item) => `<li><strong>${esc(item.title)}</strong><small>${esc(item.time)}${item.detail ? ` · ${esc(item.detail)}` : ""}</small></li>`).join("")
    : `<li><span class="empty">No radio traffic for this call sign yet.</span></li>`;
  return `
    <section class="stack">
      <article class="card">
        <h2>Message control room</h2>
        <form class="radio-form" id="radio-form">
          <label for="radio-input">Radio note</label>
          <textarea id="radio-input" name="message" maxlength="280" required placeholder="Short update for the desk">${esc(draft.note)}</textarea>
          <button type="submit" class="btn btn-gold">Send</button>
        </form>
      </article>
      <article class="card"><h2>Traffic</h2><ul class="feed">${items}</ul></article>
    </section>`;
}

function render() {
  captureDrafts();
  destroyMap();
  if (!officerId || !portal) {
    renderLogin();
    return;
  }
  const body = tab === "job" ? renderJob() : tab === "radio" ? renderRadio() : renderDuty();
  document.getElementById("phone").innerHTML = shell(body);
  if (tab === "job" && portal.job) mountMap();
}

function mountMap() {
  const node = document.getElementById("job-map");
  if (!node || !window.L || !portal.job) return;
  const job = portal.job;
  const responder = portal.responder;
  fieldMap = L.map(node, { zoomControl: false, attributionControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(fieldMap);
  const icon = (klass, label) => L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin ${klass}">${label}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
  L.marker([responder.lat, responder.lng], { icon: icon("pin-me", "You") }).addTo(fieldMap);
  L.marker([job.lat, job.lng], { icon: icon("pin-job", "!") }).addTo(fieldMap);
  L.polyline([[responder.lat, responder.lng], [job.lat, job.lng]], { color: "#2f89ff", weight: 4, opacity: 0.9 }).addTo(fieldMap);
  fieldMap.fitBounds([[responder.lat, responder.lng], [job.lat, job.lng]], { padding: [24, 24], maxZoom: 15 });
  setTimeout(() => fieldMap && fieldMap.invalidateSize(), 80);
}

async function refresh(quiet) {
  if (sheetOpen || busy) return;
  const gen = ++refreshGen;
  try {
    if (!officerId) {
      if (!token) {
        renderLogin();
        return;
      }
      const ok = await restoreSession();
      if (gen !== refreshGen || busy) return;
      if (!ok) {
        renderLogin();
        return;
      }
    }
    const previous = JSON.stringify(portal);
    const payload = await fetchPortal();
    if (gen !== refreshGen || busy) return;
    applyPortal(payload);
    if (quiet && JSON.stringify(portal) === previous && !document.getElementById("phone").querySelector(".boot")) return;
    render();
  } catch (error) {
    if (gen !== refreshGen) return;
    if (!quiet && error.message !== "Sign in required.") {
      document.getElementById("phone").innerHTML = `<p class="boot">${esc(error.message)}</p>`;
    }
  }
}

async function run(task) {
  if (busy) return;
  busy = true;
  try {
    await task();
  } catch (error) {
    const reportError = document.getElementById("report-error");
    const sheetError = document.getElementById("sheet-error");
    if (sheetOpen && sheetError) {
      sheetError.hidden = false;
      sheetError.textContent = error.message;
    } else if (reportError && document.activeElement && document.getElementById("report")) {
      reportError.hidden = false;
      reportError.textContent = error.message;
    } else {
      toast(error.message);
    }
  } finally {
    busy = false;
  }
}

document.getElementById("phone").addEventListener("click", (event) => {
  const nextTab = event.target.closest("[data-tab]");
  if (nextTab && nextTab.dataset.tab) {
    tab = nextTab.dataset.tab;
    sheetOpen = false;
    render();
    return;
  }
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode || !officerId) return;
  const action = actionNode.dataset.action;
  if (action === "sign-out") {
    signOut();
    return;
  }
  if (action === "duty") {
    return run(async () => {
      const result = await post(`/api/field/${encodeURIComponent(officerId)}/duty`, { status: actionNode.dataset.status });
      render();
      toast(result.message);
    });
  }
  if (action === "arrive") {
    return run(async () => {
      const result = await post(`/api/field/${encodeURIComponent(officerId)}/arrive`);
      render();
      toast(result.message);
    });
  }
  if (action === "ping") {
    return run(async () => {
      const result = await post(`/api/field/${encodeURIComponent(officerId)}/ping`);
      render();
      toast(result.message);
    });
  }
  if (action === "complete") {
    captureDrafts();
    return run(async () => {
      const result = await post(`/api/field/${encodeURIComponent(officerId)}/complete`, { report: draft.report });
      draft.report = "";
      tab = "duty";
      render();
      toast(result.message);
    });
  }
  if (action === "stand-down") {
    sheetOpen = true;
    render();
    const field = document.getElementById("reason");
    if (field) field.focus();
  }
});

document.getElementById("phone").addEventListener("submit", (event) => {
  if (event.target.id === "field-login") {
    event.preventDefault();
    const form = event.target;
    const error = document.getElementById("login-error");
    error.hidden = true;
    run(async () => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: new FormData(form).get("username"),
          password: new FormData(form).get("password"),
          portal: "responder"
        })
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) {
        error.hidden = false;
        error.textContent = payload.error || "Sign in failed.";
        return;
      }
      token = payload.token;
      officerId = payload.account.responderId;
      sessionStorage.setItem(TOKEN_KEY, token);
      tabReady = false;
      knownJobId = undefined;
      applyPortal(await fetchPortal());
      render();
    });
    return;
  }
  if (event.target.id === "radio-form") {
    event.preventDefault();
    const message = new FormData(event.target).get("message");
    run(async () => {
      const result = await post(`/api/field/${encodeURIComponent(officerId)}/note`, { message });
      draft.note = "";
      render();
      toast(result.message);
    });
  }
  if (event.target.id === "release-form") {
    event.preventDefault();
    const reason = new FormData(event.target).get("reason") || document.getElementById("reason").value;
    run(async () => {
      const result = await post(`/api/field/${encodeURIComponent(officerId)}/release`, { reason });
      draft.reason = "";
      sheetOpen = false;
      tab = "duty";
      render();
      toast(result.message);
    });
  }
});

document.getElementById("phone").addEventListener("click", (event) => {
  if (event.target.id === "sheet-cancel") {
    sheetOpen = false;
    draft.reason = "";
    render();
  }
});

refresh(false);
setInterval(() => refresh(true), 4000);
