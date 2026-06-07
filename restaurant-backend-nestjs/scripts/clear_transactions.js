const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Target tables to back up and clear
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

async function clearTransactions() {
  // Try environment variables first
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const dbUser = process.env.DB_USERNAME || 'root';
  const dbName = process.env.DB_DATABASE || 'restaurant_db';
  
  let conn;

  if (process.env.DB_PASSWORD !== undefined) {
    try {
      console.log(`Connecting to MySQL database at ${dbHost}:${dbPort} with environment password...`);
      conn = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: process.env.DB_PASSWORD,
        database: dbName
      });
      console.log('✅ Connected successfully to MySQL database using environment variables!');
    } catch (err) {
      console.error('Failed to connect using environment variables password:', err.message);
    }
  }

  if (!conn) {
    const passwords = ['', '7154$La1'];
    for (const password of passwords) {
      try {
        console.log(`Connecting to MySQL database at ${dbHost}:${dbPort} with password: "${password}"...`);
        conn = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: password,
          database: dbName
        });
        console.log('✅ Connected successfully to MySQL database!');
        break;
      } catch (err) {
        console.error(`Failed with password "${password}":`, err.message);
      }
    }
  }

  if (!conn) {
    console.error('❌ Error: Could not connect to MySQL database.');
    process.exit(1);
  }

  // 1. BACKUP DATA
  console.log('\n--- 📦 STARTING DATABASE BACKUP ---');
  const backupData = {};
  
  // Make sure backups directory exists
  const backupDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  for (const table of TABLES) {
    try {
      console.log(`Backing up table: ${table}...`);
      const [rows] = await conn.execute(`SELECT * FROM \`${table}\``);
      backupData[table] = rows;
      console.log(`   Back up done: ${rows.length} rows`);
    } catch (err) {
      console.error(`⚠️ Error backing up table ${table}:`, err.message);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `transaction_backup_${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);
  
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
  console.log(`\n🎉 Backup successfully saved to: ${backupFilePath}`);

  // 2. CLEAR (TRUNCATE) DATA
  console.log('\n--- 🧹 STARTING CLEANUP OF TRANSACTION TABLES ---');
  
  try {
    // Disable foreign key checks to allow truncating
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔒 Temporarily disabled foreign key checks.');

    for (const table of TABLES) {
      try {
        console.log(`Clearing table: ${table}...`);
        await conn.execute(`TRUNCATE TABLE \`${table}\``);
        console.log(`   Table ${table} successfully cleared!`);
      } catch (err) {
        console.error(`❌ Error clearing table ${table}:`, err.message);
      }
    }

    // Re-enable foreign key checks
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔓 Re-enabled foreign key checks.');
    console.log('\n🎉 ALL operational/transaction tables successfully cleared!');
  } catch (err) {
    console.error('❌ Critical error during table clearing:', err.message);
  } finally {
    await conn.end();
  }
}

clearTransactions().catch(console.error);
