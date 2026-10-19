const express = require("express");
const store = require("../data/store");

const router = express.Router();

router.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");

  const dashboard = store.getDashboard();
  const clients = dashboard.clients.filter((client) => client.area === "Matsulu");
  const clientIds = new Set(clients.map((client) => client.id));
  const incidents = dashboard.incidents.filter((incident) => clientIds.has(incident.clientId));

  res.json({ ok: true, area: "Matsulu", clients, incidents });
});

module.exports = router;
