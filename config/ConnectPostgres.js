require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres error:", err);
});

const connectPostgres = async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ Postgres connected! Current time:", res.rows[0]);

    // ❌ Drop old messages table if schema mismatch
    // await pool.query(`DROP TABLE IF EXISTS messages CASCADE;`);

    // ✅ Recreate messages table with correct schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        from_user VARCHAR(255) NOT NULL,
        to_user VARCHAR(255) NOT NULL,
        ciphertext TEXT NOT NULL,
        nonce TEXT,
        status VARCHAR(50) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ✅ Add indexes for faster lookups
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user);`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user);`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);`
    );

    console.log("✅ messages table recreated with indexes");
  } catch (err) {
    console.error("❌ Postgres connection failed:", err.stack);
    throw err;
  }
};

module.exports = { pool, connectPostgres };
