const express = require("express");
const path = require("path");
const store = require("./data/store");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

function readToken(req) {
  const header = req.get("authorization") || "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

app.post("/api/login", (req, res) => {
  const body = req.body || {};
  const result = store.login(body.username, body.password, body.portal);
  if (result.error) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, token: result.token, account: result.account });
});

app.post("/api/logout", (req, res) => {
  store.logout(readToken(req));
  res.json({ ok: true, message: "Signed out." });
});

app.use("/api", (req, res, next) => {
  const session = store.getSession(readToken(req));
  if (!session) {
    return res.status(401).json({ ok: false, error: "Sign in required." });
  }
  req.account = session;
  const path = req.path;
  if (path.startsWith("/field")) {
    if (session.role !== "responder") {
      return res.status(403).json({ ok: false, error: "The responder app is for field officers." });
    }
    const match = path.match(/^\/field\/([^/]+)/);
    if (match && decodeURIComponent(match[1]) !== session.responderId) {
      return res.status(403).json({ ok: false, error: "You can only open your own responder app." });
    }
  } else if (path.startsWith("/client")) {
    if (session.role !== "client") {
      return res.status(403).json({ ok: false, error: "The client app is for customers." });
    }
    const match = path.match(/^\/client\/([^/]+)/);
    if (match && decodeURIComponent(match[1]) !== session.clientId) {
      return res.status(403).json({ ok: false, error: "You can only open your own client app." });
    }
  } else if (session.role !== "admin") {
    return res.status(403).json({ ok: false, error: "The control room is for admin sign-in." });
  }
  next();
});

app.get("/api/session", (req, res) => {
  res.json({ ok: true, account: req.account });
});

app.get("/api/dashboard", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(store.getDashboard());
});

app.post("/api/alarms/:id/dispatch", (req, res) => {
  const responderId = req.body && req.body.responderId ? String(req.body.responderId) : null;
  const result = store.dispatchAlarm(req.params.id, responderId);
  if (result.error) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, message: result.message, dashboard: store.getDashboard() });
});

app.post("/api/alarms/:id/close", (req, res) => {
  const reason = req.body && req.body.reason ? String(req.body.reason) : "";
  const result = store.closeAlarm(req.params.id, reason);
  if (result.error) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, message: result.message, dashboard: store.getDashboard() });
});

app.post("/api/notes", (req, res) => {
  const message = req.body && req.body.message ? String(req.body.message) : "";
  const result = store.addNote(message);
  if (result.error) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, message: result.message, dashboard: store.getDashboard() });
});

app.post("/api/control-room", (req, res) => {
  const result = store.setControlRoom(req.body || {});
  if (result.error) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, message: result.message, dashboard: store.getDashboard() });
});

app.post("/api/reset", (req, res) => {
  const result = store.resetDemo();
  res.json({ ok: true, message: result.message, dashboard: store.getDashboard() });
});

app.use("/api/matsulu", require("./api/matsulu"));

function sendField(res, responderId, result) {
  if (result.error) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  const portal = store.getPortal(responderId);
  if (portal.error) {
    return res.status(portal.status).json({ ok: false, error: portal.error });
  }
  res.json({ ok: true, message: result.message, portal });
}

app.get("/api/field/:id", (req, res) => {
  res.set("Cache-Control", "no-store");
  const portal = store.getPortal(req.params.id);
  if (portal.error) {
    return res.status(portal.status).json({ ok: false, error: portal.error });
  }
  res.json(portal);
});

app.post("/api/field/:id/duty", (req, res) => {
  const status = req.body && req.body.status ? String(req.body.status) : "";
  sendField(res, req.params.id, store.setDuty(req.params.id, status));
});

app.post("/api/field/:id/arrive", (req, res) => {
  sendField(res, req.params.id, store.arriveOnScene(req.params.id));
});

app.post("/api/field/:id/complete", (req, res) => {
  const report = req.body && req.body.report ? String(req.body.report) : "";
  sendField(res, req.params.id, store.completeJob(req.params.id, report));
});

app.post("/api/field/:id/release", (req, res) => {
  const reason = req.body && req.body.reason ? String(req.body.reason) : "";
  sendField(res, req.params.id, store.releaseJob(req.params.id, reason));
});

app.post("/api/field/:id/note", (req, res) => {
  const message = req.body && req.body.message ? String(req.body.message) : "";
  sendField(res, req.params.id, store.addFieldNote(req.params.id, message));
});

app.post("/api/field/:id/ping", (req, res) => {
  sendField(res, req.params.id, store.pingLocation(req.params.id));
});

function sendClient(res, clientId, result) {
  if (result.error) {
    return res.status(result.status).json({ ok: false, error: result.error });
  }
  const portal = store.getClientPortal(clientId);
  if (portal.error) {
    return res.status(portal.status).json({ ok: false, error: portal.error });
  }
  res.json({ ok: true, message: result.message, portal });
}

app.get("/api/client/:id", (req, res) => {
  res.set("Cache-Control", "no-store");
  const portal = store.getClientPortal(req.params.id);
  if (portal.error) {
    return res.status(portal.status).json({ ok: false, error: portal.error });
  }
  res.json(portal);
});

app.post("/api/client/:id/panic", (req, res) => {
  const note = req.body && req.body.note ? String(req.body.note) : "";
  sendClient(res, req.params.id, store.raisePanic(req.params.id, note));
});

app.post("/api/client/:id/message", (req, res) => {
  const message = req.body && req.body.message ? String(req.body.message) : "";
  sendClient(res, req.params.id, store.addClientMessage(req.params.id, message));
});

app.use("/api", (req, res) => {
  res.status(404).json({ ok: false, error: "Not found." });
});

app.get("/portal", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "portal.html"));
});

app.get("/client", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "client.html"));
});

app.use("/vendor/leaflet", express.static(path.join(__dirname, "node_modules", "leaflet", "dist")));
app.use(express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ ok: false, error: "Invalid request." });
  }
  console.error(err);
  res.status(500).json({ ok: false, error: "Control room service error." });
});

app.listen(port, () => {
  console.log(`Black Tiger control room running at http://localhost:${port}`);
});
