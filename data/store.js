const crypto = require("crypto");
const DEMO_PASSWORD = hashPassword("tiger");

const FIRST = ["Ayesha", "Sipho", "Marie", "Kagiso", "Helen", "Farida", "Themba", "Johan", "Nomsa", "Pieter", "Zanele", "Chris", "Busi", "Andre", "Lindiwe", "Musa", "Elize", "Sello", "Fatima", "Hendrik"];
const LAST = ["Khan", "Nkosi", "Botha", "Mokoena", "Kruger", "Patel", "Zulu", "Venter", "Khumalo", "Mthembu", "Naidoo", "Ndlovu", "Fourie", "Sibiya", "Maseko", "Pretorius", "Mahlangu", "Ismail", "Jacobs", "Molefe"];
const AREAS = ["Nelspruit", "Nkomazi", "Barberton", "Burgersfort", "Riverside", "West Acres", "Kanyamazane", "Matsulu", "Sonheuwel", "Steiltes"];
const TOWNS = {
  Nelspruit: { lat: -25.475, lng: 30.97 },
  "Mbombela CBD": { lat: -25.475, lng: 30.97 },
  Riverside: { lat: -25.452, lng: 30.978 },
  "West Acres": { lat: -25.47, lng: 30.928 },
  Kanyamazane: { lat: -25.483, lng: 31.14 },
  Matsulu: { lat: -25.522, lng: 31.352 },
  Sonheuwel: { lat: -25.466, lng: 30.952 },
  Steiltes: { lat: -25.49, lng: 30.958 },
  Valencia: { lat: -25.458, lng: 31.0 },
  Nelsville: { lat: -25.488, lng: 30.985 },
  "Hazyview Rd": { lat: -25.043, lng: 31.127 },
  Barberton: { lat: -25.788, lng: 31.053 },
  Burgersfort: { lat: -24.672, lng: 30.324 },
  Nkomazi: { lat: -25.483, lng: 31.522 }
};
const STREETS = ["Riverside Drive", "Samora Machel Drive", "Ferreira Street", "Brown Street", "Henshall Street", "Aurora Drive", "Piet Retief Street", "Russell Street", "Ehmke Street", "Acacia Crescent"];

const NAMED = [
  ["John Mabuza", "Home", "Riverside", "12 Riverside Drive, Nelspruit", -25.455, 30.978],
  ["Thandi Dlamini", "Home", "West Acres", "18 Paul Kruger Street, West Acres", -25.4688, 30.9265],
  ["Riaan Smit", "Home", "Sonheuwel", "7 Ehmke Street, Sonheuwel", -25.466, 30.952],
  ["Nkosi Trading", "Business", "Nelspruit", "4 Samora Machel Drive, Nelspruit", -25.4748, 30.9705],
  ["Lerato Mahlangu", "Home", "Steiltes", "22 Aurora Drive, Steiltes", -25.4905, 30.958],
  ["Jabu Ndlovu", "Home", "Matsulu", "15 Acacia Crescent, Matsulu", -25.522, 31.352],
  ["Sunrise Lodge", "Business", "Barberton", "8 De Villiers Street, Barberton", -25.7865, 31.0555],
  ["Piet van Zyl", "Home", "Burgersfort", "14 Kort Street, Burgersfort", -24.6705, 30.321]
];

const BUSINESSES = [
  ["Riverside Pharmacy", "Business", "Riverside"],
  ["Lowveld Motors", "Business", "Mbombela CBD"],
  ["Mbombela Primary", "Business", "Steiltes"],
  ["Crocodile Valley Lodge", "Business", "Nkomazi"],
  ["Samora Market", "Business", "Kanyamazane"],
  ["Plaza Watch", "Business", "Burgersfort"]
];

function buildSeed() {
  const clients = makeClients();
  const clientId = (name) => clients.find((client) => client.name === name).id;

  const responders = [
    { id: "R3", name: "Responder 3", status: "En Route", location: "Nelspruit", battery: 92, lat: -25.473, lng: 30.991, assignedIncidentId: "INC-2401", onDashboard: true },
    { id: "R5", name: "Responder 5", status: "Available", location: "Riverside", battery: 76, lat: -25.448, lng: 30.962, assignedIncidentId: null, onDashboard: true },
    { id: "R7", name: "Responder 7", status: "En Route", location: "West Acres", battery: 64, lat: -25.463, lng: 30.938, assignedIncidentId: "INC-2400", onDashboard: true },
    { id: "R9", name: "Responder 9", status: "Available", location: "Barberton", battery: 88, lat: -25.79, lng: 31.049, assignedIncidentId: null, onDashboard: true },
    { id: "R11", name: "Responder 11", status: "Available", location: "Nkomazi", battery: 81, lat: -25.486, lng: 31.518, assignedIncidentId: null, onDashboard: true },
    { id: "R12", name: "Responder 12", status: "Available", location: "Burgersfort", battery: 69, lat: -24.669, lng: 30.328, assignedIncidentId: null, onDashboard: true },
    { id: "R14", name: "Responder 14", status: "Available", location: "Nelspruit", battery: 95, lat: -25.482, lng: 30.962, assignedIncidentId: null, onDashboard: true },
    { id: "R16", name: "Responder 16", status: "Available", location: "Riverside", battery: 83, lat: -25.442, lng: 30.99, assignedIncidentId: null, onDashboard: true },
    { id: "R1", name: "Responder 1", status: "Available", location: "Sonheuwel", battery: 90, lat: -25.468, lng: 30.948, assignedIncidentId: null, onDashboard: false },
    { id: "R2", name: "Responder 2", status: "Available", location: "Barberton", battery: 84, lat: -25.782, lng: 31.061, assignedIncidentId: null, onDashboard: false },
    { id: "R4", name: "Responder 4", status: "Available", location: "Nkomazi", battery: 77, lat: -25.448, lng: 31.95, assignedIncidentId: null, onDashboard: false },
    { id: "R6", name: "Responder 6", status: "Available", location: "West Acres", battery: 71, lat: -25.476, lng: 30.918, assignedIncidentId: null, onDashboard: false }
  ];
  responders.forEach((responder) => {
    responder.history = [];
  });
  responders.find((responder) => responder.id === "R7").history.push({
    id: "INC-2399",
    client: "Riaan Smit",
    type: "Medical Assist",
    time: "17:59",
    resolution: "Attended on scene. The client was stable and the incident was closed."
  });

  const incidents = [
    incident("INC-2401", "19:05", "John Mabuza", clientId, "Panic Alarm", "High", "En Route", "12 Riverside Drive, Nelspruit", -25.455, 30.978, ["R3"], ""),
    incident("INC-2400", "18:42", "Thandi Dlamini", clientId, "Perimeter Alarm", "Medium", "En Route", "18 Paul Kruger Street, West Acres", -25.4688, 30.9265, ["R7"], ""),
    incident("INC-2399", "17:56", "Riaan Smit", clientId, "Medical Assist", "High", "Closed", "7 Ehmke Street, Sonheuwel", -25.466, 30.952, [], "Responder 7 attended. The client was stable and the incident was closed."),
    incident("INC-2398", "16:23", "Nkosi Trading", clientId, "Suspicious Activity", "Medium", "Closed", "4 Samora Machel Drive, Nelspruit", -25.4748, 30.9705, [], "Premises checked. No intrusion found. Report filed with the client."),
    incident("INC-2397", "14:17", "Lerato Mahlangu", clientId, "Panic Alarm", "High", "Closed", "22 Aurora Drive, Steiltes", -25.4905, 30.958, [], "False activation confirmed with the client. Alarm restored."),
    incident("INC-2396", "12:03", "Jabu Ndlovu", clientId, "Perimeter Alarm", "Medium", "Closed", "15 Acacia Crescent, Matsulu", -25.522, 31.352, [], "Gate sensor checked and reset. Property secure."),
    incident("INC-2395", "10:45", "Sunrise Lodge", clientId, "Alarm Activation", "Medium", "Closed", "8 De Villiers Street, Barberton", -25.7865, 31.0555, [], "Reception confirmed a staff test. No response required."),
    incident("INC-2394", "08:21", "Piet van Zyl", clientId, "Medical Assist", "High", "Closed", "14 Kort Street, Burgersfort", -24.6705, 30.321, [], "Welfare check completed. Family notified and the scene was cleared.")
  ];

  const activity = [
    { id: "ACT-1", icon: "pin", title: "Responder 3 en route", time: "19:06", detail: "GPS tracking active", incidentId: "INC-2401", client: "John Mabuza", responderId: "R3" },
    { id: "ACT-2", icon: "car", title: "Dispatch sent to Responder 3", time: "19:06", detail: "2.4 km", incidentId: "INC-2401", client: "John Mabuza", responderId: "R3" },
    { id: "ACT-3", icon: "check", title: "Responder 3 accepted the alarm", time: "19:05", detail: "John Mabuza (Panic Alarm)", incidentId: "INC-2401", client: "John Mabuza", responderId: "R3" },
    { id: "ACT-4", icon: "person", title: "Client updated", time: "18:57", detail: "Thandi Dlamini", incidentId: "INC-2400", client: "Thandi Dlamini", responderId: null },
    { id: "ACT-5", icon: "doc", title: "Incident report created", time: "18:42", detail: "Perimeter Alarm", incidentId: "INC-2400", client: "Thandi Dlamini", responderId: "R7" },
    { id: "ACT-6", icon: "arrived", title: "Responder 7 arrived on scene", time: "17:59", detail: "Riaan Smit", incidentId: "INC-2399", client: "Riaan Smit", responderId: "R7" }
  ];

  const usedNames = new Set(["thandi"]);
  const accounts = [
    { id: "USR-ADMIN", username: "thandi", password: DEMO_PASSWORD, role: "admin", name: "Thandi Mokoena", responderId: null, clientId: null }
  ];
  responders.forEach((responder) => {
    accounts.push({
      id: `USR-${responder.id}`,
      username: responder.id.toLowerCase(),
      password: DEMO_PASSWORD,
      role: "responder",
      name: responder.name,
      responderId: responder.id,
      clientId: null
    });
  });
  clients.forEach((client) => {
    accounts.push({
      id: `USR-${client.id}`,
      username: usernameFromName(client.name, usedNames),
      password: DEMO_PASSWORD,
      role: "client",
      name: client.name,
      responderId: null,
      clientId: client.id
    });
  });

  return {
    operator: { name: "Thandi Mokoena", role: "Operator" },
    controlRoom: { online: true, location: "Nelspruit" },
    clients,
    responders,
    incidents,
    activity,
    accounts,
    seq: 100
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function passwordOk(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const next = crypto.scryptSync(String(password || ""), salt, 32);
  const current = Buffer.from(hash, "hex");
  if (next.length !== current.length) return false;
  return crypto.timingSafeEqual(next, current);
}

function usernameFromName(name, used) {
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "client";
  let username = base;
  let count = 2;
  while (used.has(username)) {
    username = `${base}.${count}`;
    count += 1;
  }
  used.add(username);
  return username;
}

function incident(id, time, clientName, clientId, type, priority, status, address, lat, lng, assignedResponderIds, resolution) {
  return {
    id,
    time,
    when: "14 Oct 2025",
    client: clientName,
    clientId: clientId(clientName),
    type,
    priority,
    status,
    address,
    lat,
    lng,
    assignedResponderIds,
    resolution,
    closeReason: ""
  };
}

function makeClients() {
  const rows = [...NAMED, ...BUSINESSES];
  const used = new Set(rows.map((row) => row[0]));
  let cursor = 0;
  while (rows.length < 45 && cursor < FIRST.length * LAST.length) {
    const name = `${FIRST[cursor % FIRST.length]} ${LAST[Math.floor(cursor / FIRST.length) % LAST.length]}`;
    cursor += 1;
    if (used.has(name)) continue;
    used.add(name);
    rows.push([name, "Home", AREAS[rows.length % AREAS.length]]);
  }

  return rows.map((row, rowIndex) => {
    const [name, kind, area, address, lat, lng] = row;
    const point = Number.isFinite(lat) ? { lat, lng } : jitter(rowIndex, area);
    return {
      id: `CLT-${String(rowIndex + 1).padStart(2, "0")}`,
      name,
      kind,
      area,
      address: address || `${12 + rowIndex} ${STREETS[rowIndex % STREETS.length]}, ${area}`,
      lat: point.lat,
      lng: point.lng,
      phone: `013 555 ${String(rowIndex + 1).padStart(4, "0")}`,
      plan: kind === "Business" ? "Business Watch" : "Armed Response",
      status: "Active"
    };
  });
}

function jitter(index, area) {
  const town = TOWNS[area] || TOWNS.Nelspruit;
  return {
    lat: Number((town.lat + (((index * 17) % 21) - 10) / 700).toFixed(5)),
    lng: Number((town.lng + (((index * 29) % 21) - 10) / 700).toFixed(5))
  };
}

function operatingRegion(area) {
  if (area === "Barberton") return "Barberton";
  if (area === "Burgersfort") return "Burgersfort";
  if (area === "Nkomazi") return "Nkomazi";
  return "Nelspruit";
}

let db = buildSeed();
const sessions = new Map();

function isOpen(item) {
  return item.status === "Active" || item.status === "En Route" || item.status === "Acknowledged" || item.status === "On Scene";
}

function rad(value) {
  return (value * Math.PI) / 180;
}

function kmBetween(origin, target) {
  const earth = 6371;
  const dLat = rad(target.lat - origin.lat);
  const dLng = rad(target.lng - origin.lng);
  const lat1 = rad(origin.lat);
  const lat2 = rad(target.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function nowLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date());
}

function todayLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());
}

function nextId(prefix) {
  db.seq += 1;
  return `${prefix}-${db.seq}`;
}

function responderById(id) {
  return db.responders.find((responder) => responder.id === id);
}

function curve(from, to) {
  return [
    [from.lat, from.lng],
    [from.lat + (to.lat - from.lat) * 0.35 + 0.006, from.lng + (to.lng - from.lng) * 0.35 - 0.004],
    [from.lat + (to.lat - from.lat) * 0.68 - 0.002, from.lng + (to.lng - from.lng) * 0.68 + 0.003],
    [to.lat, to.lng]
  ];
}

function routeFor(responder) {
  const target = db.incidents.find((item) => item.id === responder.assignedIncidentId);
  if (!target) return null;
  return { id: responder.id, points: curve(responder, target) };
}

function nearestFor(incident) {
  const assignedIds = new Set(incident.assignedResponderIds);
  const assigned = db.responders.filter((responder) => assignedIds.has(responder.id));
  const available = db.responders
    .filter((responder) => responder.status === "Available" && !assignedIds.has(responder.id))
    .sort((a, b) => kmBetween(incident, a) - kmBetween(incident, b));

  return [...assigned, ...available].slice(0, 4).map((responder) => ({
    id: responder.id,
    name: responder.name,
    status: responder.status,
    location: responder.location,
    battery: responder.battery,
    distanceKm: round1(kmBetween(incident, responder)),
    action: responder.status === "Available" ? "dispatch" : "view"
  }));
}

function incidentDto(item) {
  return {
    id: item.id,
    time: item.time,
    when: item.when,
    client: item.client,
    clientId: item.clientId,
    type: item.type,
    priority: item.priority,
    status: item.status,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    resolution: item.resolution,
    closeReason: item.closeReason,
    assigned: item.assignedResponderIds.map((id) => {
      const responder = responderById(id);
      return responder
        ? { id: responder.id, name: responder.name, status: responder.status }
        : { id, name: id, status: "" };
    })
  };
}

function getDashboard() {
  const featured = db.incidents.find((item) => isOpen(item) && item.priority === "High") || db.incidents.find(isOpen) || null;
  const openIds = new Set(db.incidents.filter(isOpen).map((item) => item.clientId));
  const markers = [];

  db.responders.forEach((responder) => {
    markers.push({
      id: responder.id,
      kind: "responder",
      status: responder.status,
      lat: responder.lat,
      lng: responder.lng,
      label: `${responder.name} · ${responder.status} · ${responder.location}`
    });
  });

  db.incidents.filter(isOpen).forEach((item) => {
    markers.push({
      id: item.id,
      kind: "alarm",
      status: item.status,
      lat: item.lat,
      lng: item.lng,
      label: `${item.type} · ${item.client}`
    });
  });

  const regionPins = { Nelspruit: 0, Nkomazi: 0, Barberton: 0, Burgersfort: 0 };
  db.clients.filter((client) => !openIds.has(client.id)).forEach((client) => {
    const region = operatingRegion(client.area);
    if (regionPins[region] >= 2) return;
    regionPins[region] += 1;
    markers.push({
      id: client.id,
      kind: "client",
      status: "Client",
      lat: client.lat,
      lng: client.lng,
      label: `${client.name} · ${client.area}`
    });
  });

  const allRoutes = db.responders
    .filter((responder) => responder.status === "En Route" || responder.status === "On Scene")
    .map(routeFor)
    .filter(Boolean);

  const featuredIds = new Set(featured ? featured.assignedResponderIds : []);
  const routes = allRoutes.filter((route) => featuredIds.has(route.id));

  return {
    operator: db.operator,
    controlRoom: db.controlRoom,
    summary: {
      activeAlarms: db.incidents.filter(isOpen).length,
      respondersOnline: db.responders.filter((responder) => responder.status !== "Off Duty").length,
      respondersEnRoute: db.responders.filter((responder) => responder.status === "En Route").length,
      totalClients: db.clients.length
    },
    featuredAlarm: featured
      ? {
          ...incidentDto(featured),
          nearest: nearestFor(featured)
        }
      : null,
    responders: db.responders.map((responder) => ({
      id: responder.id,
      name: responder.name,
      status: responder.status,
      location: responder.location,
      battery: responder.battery,
      lat: responder.lat,
      lng: responder.lng,
      onDashboard: responder.onDashboard,
      assignedIncidentId: responder.assignedIncidentId,
      distanceKm: featured ? round1(kmBetween(featured, responder)) : null
    })),
    incidents: db.incidents.map(incidentDto).sort((a, b) => b.time.localeCompare(a.time)),
    activity: db.activity,
    clients: db.clients,
    map: {
      center: { lat: -25.25, lng: 31.15, zoom: 9 },
      bounds: [[-25.9, 30.18], [-24.52, 32.08]],
      areas: [
        { id: "all", name: "All areas" },
        { id: "nelspruit", name: "Nelspruit", lat: -25.474, lng: 30.97, zoom: 15 },
        { id: "nkomazi", name: "Nkomazi", lat: -25.483, lng: 31.522, zoom: 14 },
        { id: "barberton", name: "Barberton", lat: -25.788, lng: 31.053, zoom: 15 },
        { id: "burgersfort", name: "Burgersfort", lat: -24.672, lng: 30.324, zoom: 15 }
      ],
      places: [
        { name: "Nelspruit", lat: -25.475, lng: 30.97 },
        { name: "Nkomazi", lat: -25.55, lng: 31.72 },
        { name: "Barberton", lat: -25.788, lng: 31.053 },
        { name: "Burgersfort", lat: -24.672, lng: 30.324 }
      ],
      markers,
      routes,
      allRoutes
    }
  };
}

function dispatchAlarm(incidentId, responderId) {
  const target = db.incidents.find((item) => item.id === incidentId);
  if (!target) return { status: 404, error: "Incident not found." };
  if (!isOpen(target)) return { status: 409, error: "This incident is already closed." };

  let responder = responderId ? responderById(responderId) : null;
  if (responderId && !responder) return { status: 404, error: "Responder not found." };
  if (!responder) {
    const available = db.responders
      .filter((item) => item.status === "Available")
      .sort((a, b) => kmBetween(target, a) - kmBetween(target, b));
    responder = available[0];
  }
  if (!responder) return { status: 409, error: "No available responders." };
  if (responder.status !== "Available") {
    return { status: 409, error: `${responder.name} is not available for dispatch.` };
  }

  responder.status = "En Route";
  responder.assignedIncidentId = target.id;
  if (!target.assignedResponderIds.includes(responder.id)) {
    target.assignedResponderIds.push(responder.id);
  }
  if (target.status === "Active" || target.status === "Acknowledged") {
    target.status = "En Route";
  }

  const distance = round1(kmBetween(target, responder)).toFixed(1);
  const time = nowLabel();
  db.activity.unshift(
    {
      id: nextId("ACT"),
      icon: "pin",
      title: `${responder.name} en route`,
      time,
      detail: "GPS tracking active",
      incidentId: target.id,
      client: target.client,
      responderId: responder.id
    },
    {
      id: nextId("ACT"),
      icon: "car",
      title: `Dispatch sent to ${responder.name}`,
      time,
      detail: `${distance} km`,
      incidentId: target.id,
      client: target.client,
      responderId: responder.id
    }
  );

  return { message: `Dispatch sent to ${responder.name}.` };
}

function closeAlarm(incidentId, reason) {
  const target = db.incidents.find((item) => item.id === incidentId);
  if (!target) return { status: 404, error: "Incident not found." };
  if (!isOpen(target)) return { status: 409, error: "This incident is already closed." };
  const clean = reason.trim();
  if (clean.length < 3) return { status: 400, error: "Enter a reason of at least 3 characters." };
  if (clean.length > 400) return { status: 400, error: "The reason is too long." };

  target.status = "Closed";
  target.closeReason = clean;
  target.resolution = clean;
  recordAttendance(target, clean);
  db.responders.forEach((responder) => {
    if (responder.assignedIncidentId === target.id) {
      responder.status = "Available";
      responder.assignedIncidentId = null;
    }
  });
  target.assignedResponderIds = [];
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "doc",
    title: "Alarm closed",
    time: nowLabel(),
    detail: `${target.client} · ${clean}`,
    incidentId: target.id,
    client: target.client,
    responderId: null
  });
  return { message: `Alarm for ${target.client} is closed.` };
}

function recordAttendance(incident, resolution) {
  incident.assignedResponderIds.forEach((id) => {
    const responder = responderById(id);
    if (!responder) return;
    responder.history.unshift({
      id: incident.id,
      client: incident.client,
      type: incident.type,
      time: nowLabel(),
      resolution
    });
  });
}

function assignedIncident(responder) {
  if (!responder.assignedIncidentId) return null;
  return db.incidents.find((item) => item.id === responder.assignedIncidentId) || null;
}

function rosterRow(responder) {
  return {
    id: responder.id,
    name: responder.name,
    status: responder.status,
    location: responder.location,
    battery: responder.battery,
    onJob: Boolean(responder.assignedIncidentId)
  };
}

function getRoster() {
  return db.responders.map(rosterRow);
}

function getPortal(responderId) {
  const responder = responderById(responderId);
  if (!responder) return { status: 404, error: "Responder not found." };
  const job = assignedIncident(responder);
  const client = job ? db.clients.find((item) => item.id === job.clientId) : null;
  const radioIds = new Set([responder.id]);
  const radio = db.activity.filter((item) => {
    if (item.responderId && radioIds.has(item.responderId)) return true;
    return job && item.incidentId === job.id;
  }).slice(0, 40);

  return {
    responder: {
      id: responder.id,
      name: responder.name,
      status: responder.status,
      location: responder.location,
      battery: responder.battery,
      lat: responder.lat,
      lng: responder.lng
    },
    controlRoom: db.controlRoom,
    job: job
      ? {
          id: job.id,
          type: job.type,
          priority: job.priority,
          status: job.status,
          client: job.client,
          phone: client ? client.phone : "",
          plan: client ? client.plan : "",
          address: job.address,
          lat: job.lat,
          lng: job.lng,
          time: job.time,
          when: job.when,
          distanceKm: round1(kmBetween(job, responder))
        }
      : null,
    history: responder.history.slice(0, 12),
    radio
  };
}

function requireResponder(responderId) {
  const responder = responderById(responderId);
  if (!responder) return { status: 404, error: "Responder not found." };
  return { responder };
}

function setDuty(responderId, status) {
  const found = requireResponder(responderId);
  if (found.error) return found;
  const responder = found.responder;
  if (status !== "Available" && status !== "Off Duty") {
    return { status: 400, error: "Duty can be Available or Off Duty." };
  }
  if (responder.assignedIncidentId) {
    return { status: 409, error: "Finish or stand down from the current job first." };
  }
  if (responder.status === status) {
    return { message: `${responder.name} is already ${status.toLowerCase()}.` };
  }
  responder.status = status;
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "person",
    title: status === "Off Duty" ? `${responder.name} went off duty` : `${responder.name} is available`,
    time: nowLabel(),
    detail: responder.location,
    incidentId: null,
    client: "",
    responderId: responder.id
  });
  return { message: status === "Off Duty" ? "You are off duty." : "You are available for dispatch." };
}

function arriveOnScene(responderId) {
  const found = requireResponder(responderId);
  if (found.error) return found;
  const responder = found.responder;
  const job = assignedIncident(responder);
  if (!job || !isOpen(job)) return { status: 409, error: "You do not have an open job." };
  if (responder.status !== "En Route") {
    return { status: 409, error: "Arrival is recorded once you are en route." };
  }
  const client = db.clients.find((item) => item.id === job.clientId);
  responder.status = "On Scene";
  responder.lat = Number((job.lat + 0.0011).toFixed(5));
  responder.lng = Number((job.lng + 0.0011).toFixed(5));
  if (client) responder.location = client.area;
  job.status = "On Scene";
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "arrived",
    title: `${responder.name} arrived on scene`,
    time: nowLabel(),
    detail: job.client,
    incidentId: job.id,
    client: job.client,
    responderId: responder.id
  });
  return { message: `On scene at ${job.client}.` };
}

function completeJob(responderId, report) {
  const found = requireResponder(responderId);
  if (found.error) return found;
  const responder = found.responder;
  const job = assignedIncident(responder);
  if (!job || !isOpen(job)) return { status: 409, error: "You do not have an open job." };
  if (responder.status !== "On Scene") {
    return { status: 409, error: "Arrive on scene before filing the report." };
  }
  const clean = String(report || "").trim();
  if (clean.length < 3) return { status: 400, error: "Enter a scene report of at least 3 characters." };
  if (clean.length > 400) return { status: 400, error: "The report is too long." };

  job.status = "Closed";
  job.closeReason = clean;
  job.resolution = clean;
  recordAttendance(job, clean);
  db.responders.forEach((item) => {
    if (item.assignedIncidentId === job.id) {
      item.status = "Available";
      item.assignedIncidentId = null;
    }
  });
  job.assignedResponderIds = [];
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "doc",
    title: `${responder.name} filed a scene report`,
    time: nowLabel(),
    detail: `${job.client} · ${clean}`,
    incidentId: job.id,
    client: job.client,
    responderId: responder.id
  });
  return { message: `Report filed. ${job.client} is closed and you are available.` };
}

function releaseJob(responderId, reason) {
  const found = requireResponder(responderId);
  if (found.error) return found;
  const responder = found.responder;
  const job = assignedIncident(responder);
  if (!job || !isOpen(job)) return { status: 409, error: "You do not have an open job." };
  const clean = String(reason || "").trim();
  if (clean.length < 3) return { status: 400, error: "Enter a reason of at least 3 characters." };
  if (clean.length > 280) return { status: 400, error: "The reason is too long." };

  job.assignedResponderIds = job.assignedResponderIds.filter((id) => id !== responder.id);
  responder.status = "Available";
  responder.assignedIncidentId = null;
  if (!job.assignedResponderIds.length && isOpen(job)) job.status = "Active";
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "car",
    title: `${responder.name} stood down`,
    time: nowLabel(),
    detail: `${job.client} · ${clean}`,
    incidentId: job.id,
    client: job.client,
    responderId: responder.id
  });
  return { message: "You are stood down and available again." };
}

function addFieldNote(responderId, message) {
  const found = requireResponder(responderId);
  if (found.error) return found;
  const responder = found.responder;
  const clean = String(message || "").trim();
  if (clean.length < 2) return { status: 400, error: "Write a short message before sending." };
  if (clean.length > 280) return { status: 400, error: "Messages are limited to 280 characters." };
  const job = assignedIncident(responder);
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "note",
    title: `${responder.name} radio`,
    time: nowLabel(),
    detail: clean,
    incidentId: job ? job.id : null,
    client: job ? job.client : "",
    responderId: responder.id
  });
  return { message: "Message sent to the control room." };
}

function pingLocation(responderId) {
  const found = requireResponder(responderId);
  if (found.error) return found;
  const responder = found.responder;
  const job = assignedIncident(responder);
  if (job && responder.status === "En Route") {
    responder.lat = Number((responder.lat + (job.lat - responder.lat) * 0.35).toFixed(5));
    responder.lng = Number((responder.lng + (job.lng - responder.lng) * 0.35).toFixed(5));
  }
  if (responder.battery > 8) responder.battery -= 1;
  return { message: job ? "GPS updated toward the scene." : "GPS ping sent." };
}

function addNote(message) {
  const clean = message.trim();
  if (clean.length < 2) return { status: 400, error: "Write a short note before posting." };
  if (clean.length > 280) return { status: 400, error: "Notes are limited to 280 characters." };
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "note",
    title: "Control room note",
    time: nowLabel(),
    detail: clean,
    incidentId: null,
    client: "",
    responderId: null
  });
  return { message: "Note added to the activity feed." };
}

function setControlRoom(body) {
  if (!body || typeof body.online !== "boolean") {
    return { status: 400, error: "Online status is required." };
  }
  db.controlRoom.online = body.online;
  return { message: body.online ? "Control room is online." : "Control room is offline." };
}

function resetDemo() {
  db = buildSeed();
  return { message: "Demo control room restored." };
}

function clientById(id) {
  return db.clients.find((client) => client.id === id);
}

function clientIncidents(client) {
  return db.incidents.filter((item) => item.clientId === client.id || item.client === client.name);
}

function nextIncidentId() {
  const max = db.incidents.reduce((top, item) => {
    const num = Number(String(item.id).replace(/[^\d]/g, ""));
    return Number.isFinite(num) ? Math.max(top, num) : top;
  }, 2400);
  return `INC-${max + 1}`;
}

function clientHeadline(status) {
  if (status === "En Route") return "A responder is on the way";
  if (status === "On Scene") return "A responder is at your property";
  if (status === "Closed" || status === "Cancelled") return "This alarm is closed";
  return "The control room has your alarm";
}

function clientAlarm(item) {
  const responders = item.assignedResponderIds.map((id) => {
    const responder = responderById(id);
    return responder ? { name: responder.name, status: responder.status } : { name: id, status: "" };
  });
  const nearest = item.assignedResponderIds.map((id) => responderById(id)).find(Boolean);
  return {
    id: item.id,
    type: item.type,
    priority: item.priority,
    status: item.status,
    address: item.address,
    time: item.time,
    when: item.when,
    headline: clientHeadline(item.status),
    responders,
    distanceKm: nearest ? round1(kmBetween(item, nearest)) : null,
    resolution: item.status === "Closed" || item.status === "Cancelled" ? item.resolution : ""
  };
}

function getClientRoster() {
  return db.clients
    .map((client) => ({
      id: client.id,
      name: client.name,
      area: client.area,
      kind: client.kind,
      plan: client.plan,
      hasOpen: clientIncidents(client).some(isOpen)
    }))
    .sort((a, b) => Number(b.hasOpen) - Number(a.hasOpen) || a.name.localeCompare(b.name));
}

function getClientPortal(clientId) {
  const client = clientById(clientId);
  if (!client) return { status: 404, error: "Client not found." };
  const mine = clientIncidents(client);
  const open = mine.find(isOpen) || null;
  const ids = new Set(mine.map((item) => item.id));
  const updates = db.activity.filter((item) => {
    if (item.incidentId && ids.has(item.incidentId)) return true;
    return item.client === client.name && String(item.title).startsWith("Message from");
  }).slice(0, 30);

  return {
    client: {
      id: client.id,
      name: client.name,
      kind: client.kind,
      area: client.area,
      address: client.address,
      phone: client.phone,
      plan: client.plan,
      status: client.status,
      lat: client.lat,
      lng: client.lng
    },
    controlRoom: { online: db.controlRoom.online, location: db.controlRoom.location },
    alarm: open ? clientAlarm(open) : null,
    history: mine.filter((item) => !isOpen(item)).map(clientAlarm),
    updates
  };
}

function raisePanic(clientId, note) {
  const client = clientById(clientId);
  if (!client) return { status: 404, error: "Client not found." };
  if (clientIncidents(client).some(isOpen)) {
    return { status: 409, error: "You already have an open alarm. The control room is handling it." };
  }
  const clean = String(note || "").trim();
  if (clean.length > 280) return { status: 400, error: "The note is too long." };

  const incident = {
    id: nextIncidentId(),
    time: nowLabel(),
    when: todayLabel(),
    client: client.name,
    clientId: client.id,
    type: "Panic Alarm",
    priority: "High",
    status: "Active",
    address: client.address,
    lat: client.lat,
    lng: client.lng,
    assignedResponderIds: [],
    resolution: "",
    closeReason: ""
  };
  db.incidents.unshift(incident);
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "pin",
    title: `Panic alarm from ${client.name}`,
    time: nowLabel(),
    detail: clean || client.address,
    incidentId: incident.id,
    client: client.name,
    responderId: null
  });
  return { message: `Alarm ${incident.id} sent to the control room.` };
}

function addClientMessage(clientId, message) {
  const client = clientById(clientId);
  if (!client) return { status: 404, error: "Client not found." };
  const clean = String(message || "").trim();
  if (clean.length < 2) return { status: 400, error: "Write a short message before sending." };
  if (clean.length > 280) return { status: 400, error: "Messages are limited to 280 characters." };
  const open = clientIncidents(client).find(isOpen) || null;
  db.activity.unshift({
    id: nextId("ACT"),
    icon: "person",
    title: `Message from ${client.name}`,
    time: nowLabel(),
    detail: clean,
    incidentId: open ? open.id : null,
    client: client.name,
    responderId: null
  });
  return { message: "Message sent to the control room." };
}

function publicAccount(account) {
  return {
    id: account.id,
    username: account.username,
    role: account.role,
    name: account.name,
    responderId: account.responderId,
    clientId: account.clientId
  };
}

function login(username, password, portal) {
  const wanted = String(portal || "");
  if (!["admin", "responder", "client"].includes(wanted)) {
    return { status: 400, error: "Sign in from the control room, the responder app, or the client app." };
  }
  const name = String(username || "").trim().toLowerCase();
  const account = db.accounts.find((item) => item.username === name);
  if (!account || !passwordOk(password, account.password)) {
    return { status: 401, error: "Username or password is incorrect." };
  }
  if (account.role !== wanted) {
    const where = account.role === "admin" ? "control room" : account.role === "responder" ? "responder app" : "client app";
    return { status: 403, error: `This account signs in on the ${where}.` };
  }
  const token = crypto.randomBytes(24).toString("hex");
  const session = publicAccount(account);
  sessions.set(token, session);
  return { token, account: session };
}

function getSession(token) {
  if (!token) return null;
  return sessions.get(String(token)) || null;
}

function logout(token) {
  sessions.delete(String(token || ""));
  return { message: "Signed out." };
}

module.exports = {
  getDashboard,
  dispatchAlarm,
  closeAlarm,
  addNote,
  setControlRoom,
  resetDemo,
  getRoster,
  getPortal,
  setDuty,
  arriveOnScene,
  completeJob,
  releaseJob,
  addFieldNote,
  pingLocation,
  getClientRoster,
  getClientPortal,
  raisePanic,
  addClientMessage,
  login,
  getSession,
  logout
};
