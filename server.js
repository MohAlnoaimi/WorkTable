const express = require("express");
const session = require("express-session");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = encodeURIComponent(process.env.AIRTABLE_TABLE_NAME);
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

const headers = {
  Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  "Content-Type": "application/json",
};

function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.status(401).json({ error: "Not logged in" });
}

app.post("/api/login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.SITE_PASSWORD) {
    req.session.loggedIn = true;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false, error: "Wrong password" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/api/check-login", (req, res) => {
  res.json({ loggedIn: !!req.session.loggedIn });
});

app.get("/api/tasks", requireLogin, async (req, res) => {
  try {
    const response = await fetch(AIRTABLE_URL, { headers });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data.records || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post("/api/tasks", requireLogin, async (req, res) => {
  try {
    const response = await fetch(AIRTABLE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields: req.body }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to add task" });
  }
});

app.patch("/api/tasks/:id", requireLogin, async (req, res) => {
  try {
    const response = await fetch(`${AIRTABLE_URL}/${req.params.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields: req.body }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete("/api/tasks/:id", requireLogin, async (req, res) => {
  try {
    const response = await fetch(`${AIRTABLE_URL}/${req.params.id}`, {
      method: "DELETE",
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("Server running on http://localhost:3000");
});
