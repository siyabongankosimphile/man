const TITLES = {
  dashboard: ["CONTROL ROOM DASHBOARD", "Monitoring | Dispatch | Protecting"],
  alarms: ["ALARMS & EVENTS", "Open alarms and dispatch"],
  clients: ["CLIENTS", "Registered customers"],
  responders: ["RESPONDERS", "Field officers and availability"],
  map: ["LIVE MAP", "Responders, alarms and client locations"],
  incidents: ["INCIDENTS", "Operational history and outcomes"],
  reports: ["REPORTS", "Counts from the current control-room records"],
  communication: ["COMMUNICATION", "Control room activity log"],
  settings: ["SETTINGS", "Control room desk"]
};

const CAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 15v2h1.2a2.4 2.4 0 0 0 4.6 0h4.4a2.4 2.4 0 0 0 4.6 0H20v-4.2L17.6 8A2 2 0 0 0 15.8 7H8.4A2 2 0 0 0 6.6 8L4 12.2zm3.5 2.2a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm9 0a1 1 0 1 1 1-1 1 1 0 0 1-1 1zM7.2 12l1-2.2h7.7L17 12z"/></svg>';
const BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a6 6 0 0 0-6 6v3.2L4 16h16l-2-3.8V9a6 6 0 0 0-6-6zm0 18a2.4 2.4 0 0 0 2.3-1.8H9.7A2.4 2.4 0 0 0 12 21z"/></svg>';
const ICONS = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" d="m6 12 4 4 8-8"/></svg>',
  car: CAR,
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6zm0 8.2A2.2 2.2 0 1 1 14.2 9 2.2 2.2 0 0 1 12 11.2z"/></svg>',
  person: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" fill="currentColor"/><path fill="currentColor" d="M6 19c.8-3 3-4.5 6-4.5s5.2 1.5 6 4.5z"/></svg>',
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3h7l4 4v14H7zm7 1.5V8h3.5z"/></svg>',
  arrived: CAR,
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 5h14v10H8l-3 3z"/></svg>'
};

let data = null;
let token = sessionStorage.getItem("bts-admin-token") || "";
let page = "dashboard";
let filter = "all";
let map = null;
let mapLayerName = "streets";
let baseLayers = [];
let busy = false;
let toastTimer = 0;
let modalOk = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function kmText(value) {
  return `${Number(value).toFixed(1)} km`;
}

function statusClass(status) {
  return String(status || "").toLowerCase().replace(/\s+/g, "");
}

function pill(status) {
  return `<span class="pill ${statusClass(status)}">${esc(status)}</span>`;
}

function battery(value) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return `<span class="batt ${width < 40 ? "low" : ""}"><span style="width:${width}%"></span></span>${width}%`;
}

function feedItem(item) {
  const detail = [item.time, item.detail].filter(Boolean).join(" · ");
  return `<li><span class="feed-icon ${esc(item.icon)}">${ICONS[item.icon] || ICONS.note}</span><span><strong>${esc(item.title)}</strong><small>${esc(detail)}</small></span></li>`;
}

function mapMarkup(id) {
  return `
    <div class="map-wrap ${id === "full-map" ? "full-map" : ""}">
      <div id="${id}" class="map"></div>
      <div class="map-tools">
        <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
        <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
        <button type="button" data-zoom="reset" aria-label="Recenter map">${ICONS.pin}</button>
        <button type="button" data-layers-toggle aria-label="Map layers" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="m12 3 8 4-8 4-8-4 8-4zm-8 8 8 4 8-4M4 16l8 4 8-4"/></svg></button>
      </div>
      <div class="layer-menu" hidden>
        <button type="button" data-layer="streets">Streets</button>
        <button type="button" data-layer="satellite">Satellite</button>
        <button type="button" data-layer="hybrid">Hybrid</button>
      </div>
      <div class="area-bar">
        ${(data.map.areas || []).map((area) => `<button type="button" class="chip${area.id === "all" ? " is-on" : ""}" data-area="${esc(area.id)}">${esc(area.name)}</button>`).join("")}
      </div>
      <ul class="legend">
        <li><span class="pin pin-alarm">${BELL}</span> Alarm / Incident</li>
        <li><span class="pin pin-available">${CAR}</span> Responder (available)</li>
        <li><span class="pin pin-enroute">${CAR}</span> Responder (en route)</li>
        <li><span class="pin pin-onscene">${CAR}</span> Responder (on scene)</li>
        <li><span class="pin pin-client"></span> Client location</li>
      </ul>
    </div>`;
}

function responderRows(list) {
  if (!list.length) return `<tr><td colspan="4" class="muted">No responders in this view.</td></tr>`;
  return list.map((responder) => `
    <tr>
      <td><span class="uid ${statusClass(responder.status)}">${CAR}${esc(responder.id)}</span></td>
      <td>${pill(responder.status)}</td>
      <td>${esc(responder.location)}</td>
      <td>${battery(responder.battery)}</td>
    </tr>`).join("");
}

function incidentRows(list) {
  if (!list.length) return `<tr><td colspan="4" class="muted">No incidents in this view.</td></tr>`;
  return list.map((incident) => `
    <tr data-open="${esc(incident.id)}" class="${incident.status === "Active" ? "is-active" : ""}" tabindex="0">
      <td>${esc(incident.time)}</td>
      <td>${esc(incident.client)}</td>
      <td>${esc(incident.type)}</td>
      <td>${pill(incident.status)}</td>
    </tr>`).join("");
}

function renderDashboard() {
  const summary = data.summary;
  const alarm = data.featuredAlarm;
  const preview = data.responders.filter((responder) => responder.onDashboard);
  const enRouteLabel = summary.respondersEnRoute === 1 ? "Responder En Route" : "Responders En Route";
  return `
    <div class="dash">
      <section class="stats">
        <button type="button" class="stat stat-red" data-nav="alarms">
          <span class="stat-icon">${BELL}</span>
          <b>${summary.activeAlarms}</b>
          <em>Active Alarms</em>
          <small>View all →</small>
        </button>
        <button type="button" class="stat stat-green" data-nav="responders">
          <span class="stat-icon">${ICONS.person}</span>
          <b>${summary.respondersOnline}</b>
          <em>Responders Online</em>
          <small>View all →</small>
        </button>
        <button type="button" class="stat stat-orange" data-nav="responders" data-filter="En Route">
          <span class="stat-icon">${CAR}</span>
          <b>${summary.respondersEnRoute}</b>
          <em>${enRouteLabel}</em>
          <small>View all →</small>
        </button>
        <button type="button" class="stat stat-blue" data-nav="clients">
          <span class="stat-icon">${ICONS.person}</span>
          <b>${summary.totalClients}</b>
          <em>Total Clients</em>
          <small>View all →</small>
        </button>
      </section>
      <section class="ops">
        <article class="panel map-panel">
          <header class="panel-head">
            <h2>Live Map — Nelspruit, Nkomazi, Barberton, Burgersfort</h2>
            <button type="button" class="linkish" data-nav="map">View all →</button>
          </header>
          ${mapMarkup("ops-map")}
        </article>
        <div class="side-col">
          ${alarmCard(alarm)}
          <article class="panel nearest">
            <h3>Nearest Available Responders</h3>
            ${nearestList(alarm)}
          </article>
        </div>
      </section>
      <section class="boards">
        <article class="panel">
          <header class="panel-head"><h2>Live Responders</h2><button type="button" class="linkish" data-nav="responders">View all →</button></header>
          <div class="panel-body"><table><thead><tr><th>ID</th><th>Status</th><th>Location</th><th>Battery</th></tr></thead><tbody>${responderRows(preview)}</tbody></table></div>
        </article>
        <article class="panel">
          <header class="panel-head"><h2>Recent Incidents</h2><button type="button" class="linkish" data-nav="incidents">View all →</button></header>
          <div class="panel-body"><table><thead><tr><th>Time</th><th>Client</th><th>Type</th><th>Status</th></tr></thead><tbody>${incidentRows(data.incidents.slice(0, 8))}</tbody></table></div>
        </article>
        <article class="panel">
          <header class="panel-head"><h2>Activity Feed</h2><button type="button" class="linkish" data-nav="communication">View all →</button></header>
          <ul class="feed">${data.activity.slice(0, 6).map(feedItem).join("")}</ul>
        </article>
      </section>
    </div>`;
}

function alarmCard(alarm) {
  if (!alarm) {
    return `<article class="panel alarm"><h2>No active alarm</h2><p class="muted">Closed alarms stay in the incident history.</p></article>`;
  }
  const names = alarm.assigned.map((responder) => responder.name).join(", ");
  const other = Math.max(0, data.summary.activeAlarms - 1);
  return `
    <article class="alarm">
      <div class="alarm-top">
        <strong>${BELL} Active Alarm</strong>
        <button type="button" class="icon-x" data-action="close" data-id="${esc(alarm.id)}" aria-label="Close alarm">×</button>
      </div>
      <div class="alarm-badges">
        <span class="tag">${esc(alarm.type.toUpperCase())}</span>
        <span class="tag tag-ghost">${esc(alarm.priority.toUpperCase())} PRIORITY</span>
      </div>
      <div class="alarm-grid">
        <span>Client</span><strong>${esc(alarm.client)}</strong>
        <span>Address</span><strong>${esc(alarm.address)}</strong>
        <span>Time</span><strong>${esc(alarm.time)} (${esc(alarm.when)})</strong>
        <span>Type</span><strong>${esc(alarm.type)}</strong>
      </div>
      ${names ? `<p class="assigned-line">Assigned · ${esc(names)}</p>` : ""}
      <button type="button" class="btn-danger" data-action="dispatch-nearest" data-id="${esc(alarm.id)}">${CAR} DISPATCH RESPONDER</button>
      ${other ? `<p class="other-link"><button type="button" class="linkish" data-nav="alarms">${other} other open alarm${other === 1 ? "" : "s"}</button></p>` : ""}
    </article>`;
}

function nearestList(alarm) {
  if (!alarm || !alarm.nearest.length) return `<p class="muted">No eligible responders.</p>`;
  return alarm.nearest.map((responder) => {
    const pinClass = responder.status === "En Route" ? "pin-enroute" : responder.status === "On Scene" ? "pin-onscene" : "pin-available";
    const action = responder.action === "dispatch"
      ? `<button type="button" class="btn-mini" data-action="dispatch" data-id="${esc(alarm.id)}" data-responder="${esc(responder.id)}">Dispatch</button>`
      : `<button type="button" class="btn-mini" data-action="view-responder" data-responder="${esc(responder.id)}">View</button>`;
    return `<div class="near"><span class="pin ${pinClass}">${CAR}</span><span><strong>${esc(responder.name)}</strong><small>${kmText(responder.distanceKm)}</small></span>${pill(responder.status)}${action}</div>`;
  }).join("");
}

function renderAlarms() {
  const open = data.incidents.filter((incident) => incident.status !== "Closed" && incident.status !== "Cancelled");
  const cards = open.length ? open.map((incident) => `
    <article class="panel" style="padding:14px">
      <header class="panel-head" style="padding:0 0 8px"><h2>${esc(incident.type)}</h2>${pill(incident.status)}</header>
      <div class="detail-list">
        <span>Client</span><strong>${esc(incident.client)}</strong>
        <span>Address</span><strong>${esc(incident.address)}</strong>
        <span>Time</span><strong>${esc(incident.time)} (${esc(incident.when)})</strong>
        <span>Assigned</span><strong>${esc(incident.assigned.map((responder) => responder.name).join(", ") || "Unassigned")}</strong>
      </div>
      <div class="toolbar" style="margin-top:12px">
        <button type="button" class="btn-danger" style="width:auto" data-action="dispatch-nearest" data-id="${esc(incident.id)}">${CAR} Dispatch nearest</button>
        <button type="button" class="btn-ghost" data-action="close" data-id="${esc(incident.id)}">Close</button>
        <button type="button" class="btn-ghost" data-action="open-incident" data-id="${esc(incident.id)}">History</button>
      </div>
    </article>`).join("") : `<article class="panel"><p class="empty">No open alarms.</p></article>`;
  return `<section class="page"><header class="page-head"><div><h2>${open.length} open</h2><p>Dispatch sends the nearest available officer and updates the map.</p></div></header><div class="stack">${cards}</div></section>`;
}

function renderClients() {
  const rows = data.clients.map((client) => `
    <tr data-search-row="${esc(`${client.name} ${client.area} ${client.address}`.toLowerCase())}">
      <td>${esc(client.name)}</td>
      <td>${esc(client.kind)}</td>
      <td>${esc(client.area)}</td>
      <td>${esc(client.address)}</td>
      <td>${esc(client.plan)}</td>
      <td>${pill(client.status)}</td>
    </tr>`).join("");
  return `
    <section class="page">
      <header class="page-head"><div><h2>Clients</h2><p>${data.clients.length} registered. Customers raise alarms from the client app.</p></div><a class="btn-ghost" href="/client" target="_blank" rel="noopener">Client app</a></header>
      <div class="toolbar"><input class="search" data-search placeholder="Search clients"></div>
      <article class="panel"><div class="panel-body"><table><thead><tr><th>Client</th><th>Type</th><th>Area</th><th>Address</th><th>Plan</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></article>
    </section>`;
}

function renderResponders() {
  const list = data.responders.filter((responder) => filter === "all" || responder.status === filter);
  const rows = list.map((responder) => `
    <tr data-search-row="${esc(`${responder.id} ${responder.name} ${responder.location} ${responder.status}`.toLowerCase())}">
      <td><span class="uid ${statusClass(responder.status)}">${CAR}${esc(responder.id)}</span></td>
      <td>${esc(responder.name)}</td>
      <td>${pill(responder.status)}</td>
      <td>${esc(responder.location)}</td>
      <td>${responder.distanceKm == null ? "—" : kmText(responder.distanceKm)}</td>
      <td>${battery(responder.battery)}</td>
    </tr>`).join("");
  return `
    <section class="page">
      <header class="page-head"><div><h2>Field roster</h2><p>Distance is measured from the featured open alarm. Officers update jobs from the field portal.</p></div><a class="btn-ghost" href="/portal" target="_blank" rel="noopener">Field portal</a></header>
      <div class="toolbar">
        ${filterChips(["all", "Available", "En Route", "On Scene", "Off Duty"])}
        <input class="search" data-search placeholder="Search responders">
      </div>
      <article class="panel"><div class="panel-body"><table><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Location</th><th>Distance</th><th>Battery</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="muted">No responders in this view.</td></tr>`}</tbody></table></div></article>
    </section>`;
}

function renderMapPage() {
  return `<section class="page"><article class="panel map-panel full-map">${mapMarkup("full-map")}</article></section>`;
}

function renderIncidents() {
  const list = data.incidents.filter((incident) => {
    if (filter === "Open") return incident.status !== "Closed" && incident.status !== "Cancelled";
    if (filter === "Closed") return incident.status === "Closed" || incident.status === "Cancelled";
    return true;
  });
  const rows = list.map((incident) => `
    <tr data-open="${esc(incident.id)}" data-search-row="${esc(`${incident.client} ${incident.type} ${incident.status}`.toLowerCase())}" tabindex="0">
      <td>${esc(incident.time)}</td>
      <td>${esc(incident.client)}</td>
      <td>${esc(incident.type)}</td>
      <td>${pill(incident.priority)}</td>
      <td>${pill(incident.status)}</td>
      <td>${esc(incident.assigned.map((responder) => responder.name).join(", ") || "—")}</td>
    </tr>`).join("");
  return `
    <section class="page">
      <header class="page-head"><div><h2>Incident records</h2><p>Open a row for the address, assigned officers and activity.</p></div></header>
      <div class="toolbar">
        ${filterChips(["all", "Open", "Closed"])}
        <input class="search" data-search placeholder="Search incidents">
      </div>
      <article class="panel"><div class="panel-body"><table><thead><tr><th>Time</th><th>Client</th><th>Type</th><th>Priority</th><th>Status</th><th>Assigned</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="muted">No incidents in this view.</td></tr>`}</tbody></table></div></article>
    </section>`;
}

function renderReports() {
  const counts = {};
  data.incidents.forEach((incident) => {
    counts[incident.type] = (counts[incident.type] || 0) + 1;
  });
  const max = Math.max(...Object.values(counts), 1);
  const bars = Object.entries(counts).map(([type, count]) => `
    <div class="bar-row"><span>${esc(type)}</span><div class="bar"><span style="width:${Math.round((count / max) * 100)}%"></span></div><strong>${count}</strong></div>`).join("");
  const available = data.responders.filter((responder) => responder.status === "Available").length;
  return `
    <section class="page">
      <div class="stats">
        <div class="stat stat-red"><span class="stat-icon">${BELL}</span><b>${data.summary.activeAlarms}</b><em>Open alarms</em></div>
        <div class="stat stat-green"><span class="stat-icon">${ICONS.person}</span><b>${available}</b><em>Available now</em></div>
        <div class="stat stat-orange"><span class="stat-icon">${CAR}</span><b>${data.summary.respondersEnRoute}</b><em>En route</em></div>
        <div class="stat stat-blue"><span class="stat-icon">${ICONS.doc}</span><b>${data.incidents.length}</b><em>Incident records</em></div>
      </div>
      <article class="panel"><header class="panel-head"><h2>Incidents by type</h2></header><div class="bars">${bars}</div></article>
    </section>`;
}

function renderCommunication() {
  return `
    <section class="page">
      <article class="panel">
        <header class="panel-head"><h2>Control room log</h2></header>
        <form class="note-form" id="note-form">
          <input name="message" maxlength="280" placeholder="Add a control room note" required>
          <button type="submit" class="btn-primary">Post note</button>
        </form>
        <ul class="feed">${data.activity.map(feedItem).join("")}</ul>
      </article>
    </section>`;
}

function renderSettings() {
  const online = data.controlRoom.online;
  return `
    <section class="page">
      <article class="panel">
        <div class="setting"><div><strong>Control room</strong><p>${esc(data.controlRoom.location)} desk · ${esc(data.operator.name)}, ${esc(data.operator.role)}</p></div></div>
        <div class="setting">
          <div><strong>Desk status</strong><p>${online ? "Operators are shown as online." : "The desk is marked offline."}</p></div>
          <button type="button" class="switch ${online ? "is-on" : ""}" data-action="toggle-room" aria-pressed="${online}" aria-label="Toggle control room online status"><i></i></button>
        </div>
        <div class="setting">
          <div><strong>Demo records</strong><p>Restore the sample alarms, responders and activity feed.</p></div>
          <button type="button" class="btn-ghost" data-action="reset">Restore demo</button>
        </div>
        <div class="setting">
          <div><strong>Field portal</strong><p>Officers sign in on the phone app, mark arrival, and file the scene report.</p></div>
          <a class="btn-ghost" href="/portal" target="_blank" rel="noopener">Open portal</a>
        </div>
        <div class="setting">
          <div><strong>Client app</strong><p>Customers sign in on their phone, send a panic alarm, and follow their own response.</p></div>
          <a class="btn-ghost" href="/client" target="_blank" rel="noopener">Open client app</a>
        </div>
      </article>
    </section>`;
}

function pageTable(title, subtitle, placeholder, headers, rows) {
  return `
    <section class="page">
      <header class="page-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div></header>
      <div class="toolbar"><input class="search" data-search placeholder="${esc(placeholder)}"></div>
      <article class="panel"><div class="panel-body"><table><thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></article>
    </section>`;
}

function filterChips(values) {
  return values.map((value) => {
    const on = filter === value ? "is-on" : "";
    const label = value === "all" ? "All" : value;
    return `<button type="button" class="chip ${on}" data-filter-set="${esc(value)}">${esc(label)}</button>`;
  }).join("");
}

const VIEWS = {
  dashboard: renderDashboard,
  alarms: renderAlarms,
  clients: renderClients,
  responders: renderResponders,
  map: renderMapPage,
  incidents: renderIncidents,
  reports: renderReports,
  communication: renderCommunication,
  settings: renderSettings
};

function destroyMap() {
  baseLayers = [];
  if (map) {
    map.remove();
    map = null;
  }
}

function applyMapLayer(name) {
  if (!map) return;
  baseLayers.forEach((layer) => map.removeLayer(layer));
  baseLayers = [];
  const add = (url, attribution) => {
    const layer = L.tileLayer(url, { attribution, maxZoom: 19 });
    layer.addTo(map);
    baseLayers.push(layer);
  };
  if (name === "satellite") {
    add("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", "Tiles &copy; Esri");
  } else if (name === "hybrid") {
    add("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", "Tiles &copy; Esri");
    add("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", "Roads &copy; Esri");
    add("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", "Places &copy; Esri");
  } else {
    name = "streets";
    add("https://tile.openstreetmap.org/{z}/{x}/{y}.png", '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  }
  mapLayerName = name;
}

function render() {
  destroyMap();
  updateChrome();
  const view = document.getElementById("view");
  const scroll = page === "dashboard" ? view.scrollTop : 0;
  view.innerHTML = VIEWS[page]();
  view.scrollTop = scroll;
  const mapId = document.getElementById("ops-map") ? "ops-map" : (document.getElementById("full-map") ? "full-map" : "");
  if (mapId) initMap(mapId);
  bindSearch();
}

function updateChrome() {
  const [title, subtitle] = TITLES[page];
  document.getElementById("page-title").textContent = title;
  const subtitleNode = document.getElementById("page-subtitle");
  if (page === "dashboard") {
    subtitleNode.innerHTML = '<button type="button" class="crumb" data-nav="dashboard">Monitoring</button><span> | </span><button type="button" class="crumb" data-nav="alarms">Dispatch</button><span> | </span><button type="button" class="crumb" data-nav="incidents">Protecting</button>';
  } else {
    subtitleNode.textContent = subtitle;
  }
  document.querySelectorAll(".nav-item").forEach((button) => {
    const active = button.dataset.nav === page;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const badge = document.getElementById("alarm-badge");
  const count = data ? data.summary.activeAlarms : 0;
  badge.hidden = count <= 0;
  badge.textContent = String(count);
  if (!data) return;
  document.getElementById("operator-name").textContent = data.operator.name;
  document.getElementById("operator-role").textContent = data.operator.role;
  document.getElementById("menu-name").textContent = data.operator.name;
  document.getElementById("menu-role").textContent = `${data.operator.role} · ${data.controlRoom.location}`;
  document.getElementById("room-label").textContent = data.controlRoom.online ? "Control Room Online" : "Control Room Offline";
  document.getElementById("room-place").textContent = data.controlRoom.location;
  document.getElementById("room-dot").classList.toggle("is-off", !data.controlRoom.online);
}

function initMap(mapId) {
  if (!window.L) {
    document.getElementById(mapId).innerHTML = '<p class="map-fallback">Map library failed to load.</p>';
    return;
  }
  const center = data.map.center;
  const routes = mapId === "full-map" ? data.map.allRoutes : data.map.routes;
  map = L.map(mapId, { zoomControl: false, attributionControl: true });
  applyMapLayer(mapLayerName);
  if (data.map.bounds) {
    map.fitBounds(data.map.bounds, { padding: [28, 28] });
  } else {
    map.setView([center.lat, center.lng], center.zoom);
  }
  data.map.places.forEach((place) => {
    L.marker([place.lat, place.lng], {
      interactive: false,
      icon: L.divIcon({ className: "place-label", html: `<span class="op-label">${esc(place.name)}</span>`, iconSize: [120, 24], iconAnchor: [60, 12] })
    }).addTo(map);
  });
  routes.forEach((route) => {
    L.polyline(route.points, { color: "#2f89ff", weight: 5, opacity: 0.95 }).addTo(map);
  });
  data.map.markers.forEach((marker) => {
    const icon = L.divIcon({
      className: "pin-wrap",
      html: markerHtml(marker),
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    const pin = L.marker([marker.lat, marker.lng], { icon, zIndexOffset: marker.kind === "alarm" ? 800 : 200 });
    pin.bindTooltip(marker.label, { direction: "top", offset: [0, -14] });
    pin.addTo(map);
  });
  const wrap = document.getElementById(mapId).parentElement;
  const showAll = () => {
    if (data.map.bounds) map.fitBounds(data.map.bounds, { padding: [28, 28] });
    else map.setView([center.lat, center.lng], center.zoom);
  };
  wrap.querySelector('[data-zoom="in"]').onclick = () => map.zoomIn();
  wrap.querySelector('[data-zoom="out"]').onclick = () => map.zoomOut();
  wrap.querySelector('[data-zoom="reset"]').onclick = () => {
    showAll();
    wrap.querySelectorAll("[data-area]").forEach((button) => button.classList.toggle("is-on", button.dataset.area === "all"));
  };
  wrap.querySelectorAll("[data-area]").forEach((button) => {
    button.onclick = () => {
      const area = (data.map.areas || []).find((item) => item.id === button.dataset.area);
      wrap.querySelectorAll("[data-area]").forEach((item) => item.classList.toggle("is-on", item === button));
      if (!area || area.id === "all") showAll();
      else map.setView([area.lat, area.lng], area.zoom);
    };
  });
  const layerMenu = wrap.querySelector(".layer-menu");
  const layerToggle = wrap.querySelector("[data-layers-toggle]");
  wrap.querySelectorAll("[data-layer]").forEach((button) => {
    button.classList.toggle("is-on", button.dataset.layer === mapLayerName);
  });
  layerToggle.onclick = () => {
    layerMenu.hidden = !layerMenu.hidden;
    layerToggle.setAttribute("aria-expanded", String(!layerMenu.hidden));
  };
  wrap.querySelectorAll("[data-layer]").forEach((button) => {
    button.onclick = () => {
      applyMapLayer(button.dataset.layer);
      wrap.querySelectorAll("[data-layer]").forEach((item) => item.classList.toggle("is-on", item.dataset.layer === mapLayerName));
      layerMenu.hidden = true;
      layerToggle.setAttribute("aria-expanded", "false");
    };
  });
  setTimeout(() => map && map.invalidateSize(), 50);
}

function markerHtml(marker) {
  if (marker.kind === "alarm") return `<div class="pin pin-alarm">${BELL}</div>`;
  if (marker.kind === "client") return `<div class="pin pin-client"></div>`;
  const tone = marker.status === "En Route" ? "pin-enroute" : marker.status === "On Scene" ? "pin-onscene" : marker.status === "Off Duty" ? "pin-offduty" : "pin-available";
  return `<div class="pin ${tone}">${CAR}</div>`;
}

function bindSearch() {
  const input = document.querySelector("[data-search]");
  if (!input) return;
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    document.querySelectorAll("[data-search-row]").forEach((row) => {
      row.classList.toggle("is-hidden", Boolean(query) && !row.dataset.searchRow.includes(query));
    });
  });
}

function navigate(next, nextFilter) {
  page = next;
  filter = nextFilter || "all";
  closeSidebar();
  const view = document.getElementById("view");
  view.scrollTop = 0;
  render();
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("is-open");
  document.getElementById("scrim").hidden = true;
}

async function load() {
  if (!token) return showLogin();
  const view = document.getElementById("view");
  try {
    const response = await fetch("/api/dashboard", { headers: authHeaders() });
    if (response.status === 401) return showLogin();
    if (!response.ok) throw new Error("The control room feed did not load.");
    data = await response.json();
    showDesk();
    render();
  } catch (error) {
    showDesk();
    view.innerHTML = `<p class="empty">${esc(error.message)}</p><button type="button" class="btn-primary" data-action="reload">Retry</button>`;
  }
}

function authHeaders(extra) {
  return { ...(extra || {}), Authorization: `Bearer ${token}` };
}

function showLogin() {
  token = "";
  data = null;
  sessionStorage.removeItem("bts-admin-token");
  document.getElementById("login-screen").hidden = false;
  document.getElementById("shell").hidden = true;
}

function showDesk() {
  document.getElementById("login-screen").hidden = true;
  document.getElementById("shell").hidden = false;
}

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {})
  });
  const payload = await response.json();
  if (response.status === 401) {
    showLogin();
    throw new Error("Sign in required.");
  }
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Request failed.");
  }
  if (payload.dashboard) data = payload.dashboard;
  return payload;
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 2800);
}

function openModal({ title, copy, input, placeholder, okLabel, onOk }) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-copy").innerHTML = copy;
  const field = document.getElementById("modal-input");
  const label = document.getElementById("modal-label");
  field.value = "";
  field.placeholder = placeholder || "";
  field.hidden = !input;
  label.hidden = !input;
  document.getElementById("modal-error").hidden = true;
  document.getElementById("modal-ok").textContent = okLabel || "Confirm";
  modalOk = onOk;
  document.getElementById("modal").hidden = false;
  (input ? field : document.getElementById("modal-ok")).focus();
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  modalOk = null;
}

function incidentById(id) {
  return data.incidents.find((incident) => incident.id === id);
}

function showIncident(id) {
  const incident = incidentById(id);
  if (!incident) return;
  const events = data.activity.filter((item) => item.incidentId === id);
  const assigned = incident.assigned.map((responder) => responder.name).join(", ") || "Unassigned";
  openModal({
    title: incident.client,
    input: false,
    okLabel: "Close",
    copy: `
      <div class="detail-list">
        <span>Type</span><strong>${esc(incident.type)}</strong>
        <span>Status</span><strong>${esc(incident.status)}</strong>
        <span>When</span><strong>${esc(incident.time)} (${esc(incident.when)})</strong>
        <span>Address</span><strong>${esc(incident.address)}</strong>
        <span>Assigned</span><strong>${esc(assigned)}</strong>
        ${incident.resolution ? `<span>Outcome</span><strong>${esc(incident.resolution)}</strong>` : ""}
      </div>
      <ul class="timeline">${events.map((item) => `<li><strong>${esc(item.time)}</strong> ${esc(item.title)}<br><span class="muted">${esc(item.detail)}</span></li>`).join("") || "<li>No activity recorded yet.</li>"}</ul>`,
    onOk: async () => {}
  });
}

async function run(task) {
  if (busy) return;
  busy = true;
  try {
    await task();
  } catch (error) {
    toast(error.message);
  } finally {
    busy = false;
  }
}

function tick() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type).value;
  document.getElementById("clock-time").textContent = `${pick("hour")}:${pick("minute")}`;
  document.getElementById("clock-date").textContent = `${pick("weekday")}, ${pick("day")} ${pick("month")} ${pick("year")}`;
}

document.addEventListener("click", (event) => {
  const actionNode = event.target.closest("[data-action]");
  if (actionNode) {
    event.preventDefault();
    handleAction(actionNode);
    return;
  }
  const filterNode = event.target.closest("[data-filter-set]");
  if (filterNode) {
    filter = filterNode.dataset.filterSet;
    render();
    return;
  }
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    navigate(nav.dataset.nav, nav.dataset.filter || "all");
    return;
  }
  const row = event.target.closest("[data-open]");
  if (row) showIncident(row.dataset.open);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    closeSidebar();
    document.getElementById("operator-menu").hidden = true;
  }
  if (event.key === "Enter") {
    const row = event.target.closest("[data-open]");
    if (row) showIncident(row.dataset.open);
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "note-form") return;
  event.preventDefault();
  const message = new FormData(event.target).get("message");
  run(async () => {
    const result = await post("/api/notes", { message });
    render();
    toast(result.message);
  });
});

document.getElementById("operator-btn").addEventListener("click", (event) => {
  event.stopPropagation();
  const menu = document.getElementById("operator-menu");
  menu.hidden = !menu.hidden;
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".operator")) {
    document.getElementById("operator-menu").hidden = true;
  }
});

document.getElementById("menu-btn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.add("is-open");
  document.getElementById("scrim").hidden = false;
});
document.getElementById("scrim").addEventListener("click", closeSidebar);
document.getElementById("modal-cancel").addEventListener("click", closeModal);
document.getElementById("modal-ok").addEventListener("click", () => {
  run(async () => {
    if (!modalOk) return closeModal();
    const value = document.getElementById("modal-input").value;
    try {
      await modalOk(value);
      closeModal();
    } catch (error) {
      const node = document.getElementById("modal-error");
      node.hidden = false;
      node.textContent = error.message;
    }
  });
});

function handleAction(node) {
  const action = node.dataset.action;
  const id = node.dataset.id;
  if (action === "reload") return load();
  if (action === "open-incident") return showIncident(id);
  if (action === "view-responder") {
    const responder = data.responders.find((item) => item.id === node.dataset.responder);
    if (responder) toast(`${responder.name} · ${responder.status} · ${responder.location} · Battery ${responder.battery}%`);
    return;
  }
  if (action === "dispatch" || action === "dispatch-nearest") {
    return run(async () => {
      const result = await post(`/api/alarms/${id}/dispatch`, { responderId: node.dataset.responder || null });
      render();
      toast(result.message);
    });
  }
  if (action === "close") {
    const incident = incidentById(id);
    if (!incident) return;
    openModal({
      title: "Close alarm",
      copy: `<p>${esc(incident.client)} · ${esc(incident.type)}. Closing records a reason and releases assigned responders.</p>`,
      input: true,
      placeholder: "Reason for closing",
      okLabel: "Close alarm",
      onOk: async (reason) => {
        const result = await post(`/api/alarms/${id}/close`, { reason });
        render();
        toast(result.message);
      }
    });
    return;
  }
  if (action === "toggle-room") {
    return run(async () => {
      const result = await post("/api/control-room", { online: !data.controlRoom.online });
      render();
      toast(result.message);
    });
  }
  if (action === "reset") {
    openModal({
      title: "Restore demo data",
      copy: "<p>This puts the sample alarms, responders and activity feed back to their starting state.</p>",
      input: false,
      okLabel: "Restore",
      onOk: async () => {
        const result = await post("/api/reset");
        render();
        toast(result.message);
      }
    });
  }
}

document.getElementById("sign-out").addEventListener("click", () => {
  const current = token;
  showLogin();
  fetch("/api/logout", { method: "POST", headers: { Authorization: `Bearer ${current}` } }).catch(() => {});
});

document.getElementById("login-form").addEventListener("submit", (event) => {
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
        portal: "admin"
      })
    });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) {
      error.hidden = false;
      error.textContent = payload.error || "Sign in failed.";
      return;
    }
    token = payload.token;
    sessionStorage.setItem("bts-admin-token", token);
    form.reset();
    await load();
  });
});

tick();
setInterval(tick, 1000);
setInterval(async () => {
  if (busy || !data || !document.getElementById("modal").hidden) return;
  try {
    const response = await fetch("/api/dashboard", { headers: authHeaders() });
    if (response.status === 401) return showLogin();
    if (!response.ok) return;
    const next = await response.json();
    if (JSON.stringify(next) === JSON.stringify(data)) return;
    data = next;
    render();
  } catch (error) {
    /* The next poll retries the desk feed. */
  }
}, 4000);
load();
