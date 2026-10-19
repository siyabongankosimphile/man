const TOKEN_KEY = "bts-client-token";
const MARK = `<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#14181d"/><circle cx="32" cy="32" r="28" fill="#e0a100"/><path d="M16 27 22 12l7 12zM48 27 42 12l-7 12z" fill="#1a1d22"/><ellipse cx="32" cy="35" rx="15" ry="13" fill="#f3d48a"/><ellipse cx="26" cy="34" rx="2" ry="2.3" fill="#1a1d22"/><ellipse cx="38" cy="34" rx="2" ry="2.3" fill="#1a1d22"/></svg>`;
const STEPS = [
  "Alert received",
  "Control room acknowledged",
  "Responder assigned",
  "Responder en route",
  "Responder arrived"
];

let token = sessionStorage.getItem(TOKEN_KEY) || "";
let clientId = "";
let portal = null;
let tab = "home";
let tabReady = false;
let knownAlarm = undefined;
let knownStatus = "";
let homeMap = null;
let busy = false;
let refreshGen = 0;
let toastTimer = 0;
let sheetOpen = false;
const draft = { note: "", message: "" };

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function stepIndex(alarm) {
  const status = alarm && alarm.status;
  if (status === "Closed" || status === "Cancelled") return STEPS.length;
  if (status === "On Scene") return 4;
  if (status === "En Route") return 3;
  if (alarm && alarm.responders && alarm.responders.length) return 2;
  return 1;
}

function stepsHtml(alarm) {
  const current = stepIndex(alarm);
  return `<ol class="steps">${STEPS.map((label, index) => {
    const state = index < current ? "done" : index === current ? "now" : "";
    const mark = index < current ? "✓" : "";
    return `<li class="${state}"><i>${mark}</i><span>${esc(label)}</span></li>`;
  }).join("")}</ol>`;
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    hourCycle: "h23"
  }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(name) {
  return String(name || "").split(" ")[0];
}

function captureDrafts() {
  const note = document.getElementById("panic-note");
  const message = document.getElementById("client-message");
  if (note) draft.note = note.value;
  if (message) draft.message = message.value;
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
}

function destroyMap() {
  if (homeMap) {
    homeMap.remove();
    homeMap = null;
  }
}

function authHeaders(extra) {
  return { ...(extra || {}), Authorization: `Bearer ${token}` };
}

function signOut() {
  const current = token;
  token = "";
  clientId = "";
  portal = null;
  tabReady = false;
  knownAlarm = undefined;
  knownStatus = "";
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
  if (!payload.account || payload.account.role !== "client") return false;
  clientId = payload.account.clientId;
  return true;
}

async function fetchPortal() {
  const response = await fetch(`/api/client/${encodeURIComponent(clientId)}`, { headers: authHeaders() });
  const payload = await response.json();
  if (response.status === 401) {
    signOut();
    throw new Error("Sign in required.");
  }
  if (!response.ok) throw new Error(payload.error || "This client account could not be opened.");
  return payload;
}

function applyPortal(payload) {
  const nextId = payload.alarm ? payload.alarm.id : null;
  const nextStatus = payload.alarm ? payload.alarm.status : "";
  if (!tabReady) {
    tab = payload.alarm ? "home" : "home";
    tabReady = true;
  } else if (nextId && nextId !== knownAlarm) {
    tab = "home";
    toast(payload.alarm.headline);
  } else if (knownAlarm && nextStatus && nextStatus !== knownStatus) {
    toast(payload.alarm.headline);
  } else if (knownAlarm && !nextId) {
    toast("Your alarm is closed.");
  }
  knownAlarm = nextId;
  knownStatus = nextStatus;
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
    knownAlarm = payload.portal.alarm ? payload.portal.alarm.id : null;
    knownStatus = payload.portal.alarm ? payload.portal.alarm.status : "";
    portal = payload.portal;
  }
  return payload;
}

function shell(body) {
  const client = portal.client;
  const offline = portal.controlRoom && portal.controlRoom.online === false;
  return `
    <header class="top">
      ${MARK}
      <div class="brand">BLACK TIGER<span>CLIENT</span></div>
      <div class="who"><strong>${esc(client.name)}</strong><small>${esc(client.plan)}</small></div>
    </header>
    <div class="screen" id="screen">
      ${offline && tab === "home" ? `<p class="banner">The control room is offline. An alert can still be sent. If it is not confirmed, use another way to call for help.</p>` : ""}
      ${body}
    </div>
    ${dock()}
    <nav class="tabs" aria-label="Client app">
      <button type="button" data-tab="home" class="${tab === "home" ? "is-on" : ""}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>
        Home
      </button>
      <button type="button" data-tab="safety" class="${tab === "safety" ? "is-on" : ""}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 5 6v6c0 4.2 2.8 7.2 7 8.5 4.2-1.3 7-4.3 7-8.5V6z"/></svg>
        Safety
      </button>
      <button type="button" data-tab="alerts" class="${tab === "alerts" ? "is-on" : ""}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a6 6 0 0 0-6 6v3.2L4 16h16l-2-3.8V9a6 6 0 0 0-6-6zm0 18a2.4 2.4 0 0 0 2.3-1.8H9.7A2.4 2.4 0 0 0 12 21z"/></svg>
        Alerts
      </button>
      <button type="button" data-tab="support" class="${tab === "support" ? "is-on" : ""}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 5h14v10H8l-3 3z"/></svg>
        Support
      </button>
      <button type="button" data-tab="profile" class="${tab === "profile" ? "is-on" : ""}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" fill="currentColor"/><path fill="currentColor" d="M6 19c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5z"/></svg>
        Profile
      </button>
    </nav>
    <div id="sheet" class="sheet" ${sheetOpen ? "" : "hidden"}>
      <form class="sheet-card" id="panic-form">
        <h3>Request emergency assistance?</h3>
        <p>The ${esc(portal.controlRoom.location)} control room receives this property and your account. A reference number appears only after the server confirms the alert.</p>
        <div class="pick"><span>Selected property</span><strong>${esc(client.address)}</strong></div>
        <label for="panic-note">Optional note</label>
        <textarea id="panic-note" name="note" maxlength="280" placeholder="Only if you can type safely">${esc(draft.note)}</textarea>
        <p id="sheet-error" class="form-error" hidden></p>
        <div class="actions">
          <button type="submit" class="btn btn-red">Send emergency alert</button>
          <button type="button" class="btn btn-ghost" id="sheet-cancel">Cancel</button>
        </div>
      </form>
    </div>`;
}

function dock() {
  if (tab !== "home") return "";
  if (portal.alarm) {
    return `<div class="sos-dock live-dock"><strong>${esc(portal.alarm.id)}</strong><span>${esc(portal.alarm.headline)}</span></div>`;
  }
  return `
    <div class="sos-dock">
      <p>Need emergency assistance?</p>
      <button type="button" class="sos" data-action="panic">SOS</button>
      <small>Tap to start a request. You confirm it before anything is sent.</small>
    </div>`;
}

function renderLogin() {
  destroyMap();
  document.getElementById("phone").innerHTML = `
    <div class="screen gate">
      <header class="top" style="margin:-14px -14px 16px">
        ${MARK}
        <div class="brand">BLACK TIGER<span>CLIENT</span></div>
      </header>
      <p class="motto">Always watching · Always ready</p>
      <h1>Client sign-in</h1>
      <p class="lead">Sign in to request help, follow an alarm, and message the Nelspruit control room.</p>
      <form id="client-login" class="login-form">
        <label for="client-username">Username</label>
        <input id="client-username" name="username" autocomplete="username" required>
        <label for="client-password">Password</label>
        <div class="secret">
          <input id="client-password" name="password" type="password" autocomplete="current-password" required>
          <button type="button" data-action="show-password">Show</button>
        </div>
        <p id="login-error" class="form-error" hidden></p>
        <button type="submit" class="btn btn-red">Sign in</button>
      </form>
      <p class="lead">Sample client: <strong>john.mabuza</strong> / <strong>tiger</strong></p>
      <p class="desk-link"><a href="/portal">Responder app</a> · <a href="/">Control room</a></p>
    </div>`;
}

function responderLine(alarm) {
  if (!alarm.responders.length) return "A responder is assigned once the control room dispatches one.";
  return alarm.responders.map((responder) => {
    const distance = alarm.distanceKm == null ? "" : ` · ${Number(alarm.distanceKm).toFixed(1)} km away`;
    return `${responder.name} · ${responder.status}${distance}`;
  }).join(", ");
}

function serviceBadge(client) {
  if (client.status === "Active" && portal.controlRoom.online) {
    return `<span class="live"><i></i> Security service active</span>`;
  }
  if (client.status !== "Active") return `<span class="live off"><i></i> Account ${esc(client.status)}</span>`;
  return `<span class="live warn"><i></i> Control room offline</span>`;
}

function renderHome() {
  const client = portal.client;
  const alarm = portal.alarm;
  if (alarm) {
    return `
      <section class="stack">
        <p class="hello">${esc(greeting())}, ${esc(firstName(client.name))}</p>
        ${serviceBadge(client)}
        <article class="card alarm-card">
          <p class="kicker">${esc(alarm.type)} · ${esc(alarm.status)}</p>
          <h1>${esc(alarm.headline)}</h1>
          <p class="ref">${esc(alarm.id)} · ${esc(alarm.time)} (${esc(alarm.when)})</p>
          <p>${esc(alarm.address)}</p>
          ${stepsHtml(alarm)}
          <p>${esc(responderLine(alarm))}</p>
        </article>
      </section>`;
  }
  return `
    <section class="stack">
      <div class="hello-block">
        <p class="hello">${esc(greeting())}</p>
        <h1>Welcome back, ${esc(firstName(client.name))}</h1>
        ${serviceBadge(client)}
      </div>
      <button type="button" class="link-row" data-tab="safety">
        <span>Primary property</span>
        <strong>${esc(client.address)}</strong>
        <small>${esc(client.plan)} · ${esc(client.area)}</small>
      </button>
      <button type="button" class="link-row" data-tab="alerts">
        <span>Incident history</span>
        <strong>${portal.history.length ? `${portal.history.length} closed` : "No closed incidents"}</strong>
      </button>
      <button type="button" class="link-row" data-tab="support">
        <span>Support</span>
        <strong>Contact the control room</strong>
      </button>
    </section>`;
}

function renderSafety() {
  const client = portal.client;
  return `
    <section class="stack">
      <article class="card">
        <p class="kicker">Registered property</p>
        <h1>${esc(client.address)}</h1>
        <div class="facts">
          <span>Area</span><strong>${esc(client.area)}</strong>
          <span>Type</span><strong>${esc(client.kind)}</strong>
          <span>Plan</span><strong>${esc(client.plan)}</strong>
          <span>Status</span><strong>${esc(client.status)}</strong>
        </div>
      </article>
      <div id="home-map" class="map" role="img" aria-label="Map of the registered property"></div>
    </section>`;
}

function renderAlerts() {
  const alarm = portal.alarm;
  const updates = portal.updates.length
    ? portal.updates.map((item) => `<li><strong>${esc(item.title)}</strong><small>${esc(item.time)}${item.detail ? ` · ${esc(item.detail)}` : ""}</small></li>`).join("")
    : `<li><span class="muted">Updates from your alarms and messages appear here.</span></li>`;
  const history = portal.history.length
    ? portal.history.map((item) => `
        <li>
          <strong>${esc(item.id)} · ${esc(item.type)}</strong>
          <small>${esc(item.time)} (${esc(item.when)}) · ${esc(item.address)}</small>
          <small>${esc(item.status)}${item.resolution ? ` · ${esc(item.resolution)}` : ""}</small>
        </li>`).join("")
    : `<li><span class="muted">No closed incidents on this account.</span></li>`;
  return `
    <section class="stack">
      ${alarm ? `<button type="button" class="link-row" data-tab="home"><span>Open alarm</span><strong>${esc(alarm.id)} · ${esc(alarm.headline)}</strong></button>` : ""}
      <article class="card"><h2>Updates</h2><ul class="feed">${updates}</ul></article>
      <article class="card"><h2>Closed incidents</h2><ul class="feed">${history}</ul></article>
    </section>`;
}

function renderSupport() {
  const desk = portal.controlRoom;
  const state = desk.online
    ? `<span class="live"><i></i> ${esc(desk.location)} desk online</span>`
    : `<span class="live off"><i></i> ${esc(desk.location)} desk offline</span>`;
  return `
    <section class="stack">
      <p class="banner">This screen is for ordinary messages. An emergency uses the SOS button on Home.</p>
      <article class="card">
        <h2>Control room</h2>
        <p style="margin-top:10px">${state}</p>
      </article>
      <article class="card">
        <h2>Message the desk</h2>
        <form id="message-form" class="actions">
          <label for="client-message">Message</label>
          <textarea id="client-message" name="message" maxlength="280" required placeholder="What should the control room know?">${esc(draft.message)}</textarea>
          <button type="submit" class="btn btn-ghost">Send message</button>
        </form>
      </article>
    </section>`;
}

function renderProfile() {
  const client = portal.client;
  return `
    <section class="stack">
      <article class="card">
        <p class="kicker">${esc(client.kind)}</p>
        <h1>${esc(client.name)}</h1>
        <div class="facts">
          <span>Plan</span><strong>${esc(client.plan)}</strong>
          <span>Phone</span><strong><a href="tel:${esc(String(client.phone).replace(/[^\d+]/g, ""))}">${esc(client.phone)}</a></strong>
          <span>Address</span><strong>${esc(client.address)}</strong>
          <span>Status</span><strong>${esc(client.status)}</strong>
        </div>
      </article>
      <button type="button" class="btn btn-ghost" data-action="sign-out">Sign out</button>
    </section>`;
}

function render() {
  captureDrafts();
  destroyMap();
  if (!clientId || !portal) {
    renderLogin();
    return;
  }
  const screens = { home: renderHome, safety: renderSafety, alerts: renderAlerts, support: renderSupport, profile: renderProfile };
  const draw = screens[tab] || renderHome;
  if (!screens[tab]) tab = "home";
  document.getElementById("phone").innerHTML = shell(draw());
  if (tab === "safety") mountMap();
}

function mountMap() {
  const node = document.getElementById("home-map");
  if (!node || !window.L || !portal) return;
  const client = portal.client;
  homeMap = L.map(node, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(homeMap);
  L.marker([client.lat, client.lng], {
    interactive: false,
    icon: L.divIcon({ className: "pin-wrap", html: `<div class="pin"></div>`, iconSize: [16, 16], iconAnchor: [8, 16] })
  }).addTo(homeMap);
  homeMap.setView([client.lat, client.lng], 15);
  setTimeout(() => homeMap && homeMap.invalidateSize(), 80);
}

async function refresh(quiet) {
  if (sheetOpen || busy) return;
  const gen = ++refreshGen;
  try {
    if (!clientId) {
      if (!token) {
        if (!document.getElementById("client-login")) renderLogin();
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
    if (!quiet && error.message !== "Sign in required.") document.getElementById("phone").innerHTML = `<p class="boot">${esc(error.message)}</p>`;
  }
}

async function run(task) {
  if (busy) return;
  busy = true;
  try {
    await task();
  } catch (error) {
    const sheetError = document.getElementById("sheet-error");
    if (sheetOpen && sheetError) {
      sheetError.hidden = false;
      sheetError.textContent = error.message;
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
  if (!actionNode) return;
  const action = actionNode.dataset.action;
  if (action === "show-password") {
    const input = document.getElementById("client-password");
    if (!input) return;
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    actionNode.textContent = showing ? "Show" : "Hide";
    return;
  }
  if (action === "panic") {
    sheetOpen = true;
    render();
    const field = document.getElementById("panic-note");
    if (field) field.focus();
    return;
  }
  if (action === "sign-out") {
    signOut();
  }
});

document.getElementById("phone").addEventListener("submit", (event) => {
  if (event.target.id === "client-login") {
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
          portal: "client"
        })
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) {
        error.hidden = false;
        error.textContent = payload.error || "Sign in failed.";
        return;
      }
      token = payload.token;
      clientId = payload.account.clientId;
      sessionStorage.setItem(TOKEN_KEY, token);
      tabReady = false;
      knownAlarm = undefined;
      knownStatus = "";
      applyPortal(await fetchPortal());
      render();
    });
    return;
  }
  if (event.target.id === "panic-form") {
    event.preventDefault();
    const note = document.getElementById("panic-note").value;
    run(async () => {
      const result = await post(`/api/client/${encodeURIComponent(clientId)}/panic`, { note });
      draft.note = "";
      sheetOpen = false;
      tab = "home";
      render();
      toast(result.message);
    });
  }
  if (event.target.id === "message-form") {
    event.preventDefault();
    const message = document.getElementById("client-message").value;
    run(async () => {
      const result = await post(`/api/client/${encodeURIComponent(clientId)}/message`, { message });
      draft.message = "";
      render();
      toast(result.message);
    });
  }
});

document.getElementById("phone").addEventListener("click", (event) => {
  if (event.target.id === "sheet-cancel") {
    sheetOpen = false;
    draft.note = "";
    render();
  }
});

refresh(false);
setInterval(() => refresh(true), 4000);
