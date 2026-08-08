// VexarDrive - Fleet Ping Service (minimal demo backend)
// NOTE: This is a deliberately trimmed-down module extracted from a larger monorepo
// for the purposes of this assessment. Treat it as inherited legacy code.

const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// --- DB connection ---------------------------------------------------
// Hardcoded credentials (intentional - do not "just" move to .env and stop there)
const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "vexaradmin",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "vexar_fleet",
};

const pool = new Pool(DB_CONFIG);

const JWT_SECRET = process.env.JWT_SECRET;


function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "authentication required" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "admin access required" });
  }

  next();
}
// --- Routes ------------------------------------------------------------

app.get("/", (req, res) => {
  res.send("VexarDrive Fleet Ping Service is running");
});

// Fleet vehicle ping ingestion - called very frequently by devices in the field
app.post("/api/fleet/ping", async (req, res) => {
  const { vehicleId, lat, lng, speed, timestamp } = req.body;


  if (
    !vehicleId ||
    lat === undefined ||
    lng === undefined ||
    speed === undefined ||
    !timestamp
  ) {
    return res.status(400).json({ error: "invalid ping data" });
  }

  // A brand new client connection is opened and torn down on every single request.
  try {
    await pool.query(
      `INSERT INTO fleet_pings (vehicle_id, lat, lng, speed, ts) VALUES ($1, $2, $3, $4, $5)`,
      [vehicleId, lat, lng, speed, timestamp]
    );
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "insert failed" });
  }
});

// Driver login
app.post("/api/auth/login", async (req, res) => {
  const { phone, otp } = req.body;


  if (!phone || !otp) {
    return res.status(400).json({ error: "phone and otp are required" });
  }

  const result = await pool.query(
    `SELECT * FROM drivers WHERE phone = $1`,
    [phone]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  // OTP verification is not implemented in the inherited service.
  // JWT should only be issued after successful OTP verification.

  const token = jwt.sign(
    {
      driverId: result.rows[0].id,
      role: result.rows[0].role,
    },
    JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
  res.json({ token });
});

// Admin endpoint to fetch all driver data - no auth check
app.get("/api/admin/drivers", authenticateToken, requireAdmin, async (req, res) => {
  
  const result = await pool.query(`SELECT * FROM drivers`);

  res.json(result.rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
