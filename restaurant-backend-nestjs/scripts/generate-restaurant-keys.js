const crypto = require("crypto");
const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  console.log("🔑 Generating API keys for restaurants...\n");

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "restaurant_db",
  });

  // First, run the migration
  console.log("📋 Running migration: Add api_key column...");
  try {
    await db.query(`
      ALTER TABLE restaurant_tbl
        ADD COLUMN api_key VARCHAR(64) UNIQUE NULL
    `);
    console.log("✓ Column added successfully");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("✓ Column already exists, skipping...");
    } else {
      throw err;
    }
  }

  try {
    await db.query(`CREATE INDEX idx_restaurant_api_key ON restaurant_tbl (api_key)`);
    console.log("✓ Index created successfully\n");
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log("✓ Index already exists, skipping...\n");
    } else {
      throw err;
    }
  }

  // Generate keys for existing restaurants
  const [restaurants] = await db.query("SELECT restaurant_id FROM restaurant_tbl");
  
  if (restaurants.length === 0) {
    console.log("⚠ No restaurants found in database");
    await db.end();
    return;
  }

  console.log(`📍 Found ${restaurants.length} restaurant(s)\n`);

  for (const r of restaurants) {
    const apiKey = crypto.randomBytes(32).toString("hex"); // 64 chars
    await db.query(
      "UPDATE restaurant_tbl SET api_key=? WHERE restaurant_id=? AND (api_key IS NULL OR api_key='')",
      [apiKey, r.restaurant_id]
    );
    console.log(`✓ restaurant_id=${r.restaurant_id}`);
    console.log(`  api_key=${apiKey}\n`);
  }

  console.log("✅ All API keys generated successfully!");
  console.log("⚠ SAVE THESE KEYS - You'll need them for testing\n");

  await db.end();
})().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
