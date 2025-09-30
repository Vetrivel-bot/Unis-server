require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Optional: handle unexpected errors
pool.on("error", (err) => {
  console.error("Unexpected Postgres error:", err);
});

// Wrap connection check in a function
const connectPostgres = async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Postgres connected! Current time:", res.rows[0]);
  } catch (err) {
    console.error("❌ Postgres connection failed:", err.stack);
    throw err;
  }
};

module.exports = { pool, connectPostgres };
