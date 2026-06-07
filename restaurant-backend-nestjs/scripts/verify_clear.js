const mysql = require('mysql2/promise');

const TABLES = [
  'kitchen_orders_tbl',
  'kitchen_order_items_tbl',
  'invoices',
  'bill_actions',
  'old_orders_tbl',
  'orders_tbl',
  'room_orders_tbl',
  'reports_history_tbl',
  'promo_code_usage_tbl',
  'cart_tbl',
  'room_cart_tbl',
  'active_sessions',
  'room_active_sessions',
  'housekeeping_requests_tbl',
  'housekeeping_tbl',
  'settings_requests',
  'contact_requests_tbl'
];

async function verify() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const dbUser = process.env.DB_USERNAME || 'root';
  const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  const dbName = process.env.DB_DATABASE || 'restaurant_db';

  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName
  });

  console.log('\n--- VERIFYING TABLE ROW COUNTS ---');
  let allZero = true;
  for (const table of TABLES) {
    const [rows] = await conn.execute(`SELECT COUNT(*) AS count FROM \`${table}\``);
    const count = rows[0].count;
    if (count > 0) {
      console.log(`❌ ${table}: ${count} rows (Expected 0)`);
      allZero = false;
    } else {
      console.log(`✅ ${table}: 0 rows`);
    }
  }

  if (allZero) {
    console.log('\n🎉 SUCCESS: All operational tables are completely empty!');
  } else {
    console.error('\n⚠️ WARNING: Some tables are not fully cleared.');
  }

  await conn.end();
}

verify().catch(console.error);
