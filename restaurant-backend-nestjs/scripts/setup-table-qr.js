const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupTableQR() {
  let connection;

  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'hotel_db',
    });

    console.log('✅ Connected to database');

    // Step 1: Run migration to create table_qr_tbl
    console.log('\n📋 Running migration: create-table-qr.sql');
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create-table-qr.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await connection.query(migrationSQL);
    console.log('✅ Table table_qr_tbl created successfully');

    // Step 2: Get all restaurants
    const [restaurants] = await connection.query(
      'SELECT restaurant_id, restaurant_name FROM restaurant_tbl ORDER BY restaurant_id'
    );

    if (restaurants.length === 0) {
      console.log('⚠️  No restaurants found in database');
      return;
    }

    console.log(`\n📍 Found ${restaurants.length} restaurants`);

    // Step 3: Generate table QR codes for each restaurant
    const tables = [
      'T-1', 'T-2', 'T-3', 'T-4', 'T-5', 
      'T-6', 'T-7', 'T-8', 'T-9', 'T-10',
      'Table 1', 'Table 2', 'Table 3'
    ];

    let totalCreated = 0;

    for (const restaurant of restaurants) {
      console.log(`\n🏢 Restaurant: ${restaurant.restaurant_name} (ID: ${restaurant.restaurant_id})`);
      
      // Create 5 tables per restaurant
      for (let i = 0; i < 5; i++) {
        const tableNo = tables[i];
        const tableKey = crypto.randomBytes(32).toString('hex'); // 64 characters

        try {
          await connection.query(
            `INSERT INTO table_qr_tbl (restaurant_id, table_no, table_key, is_active, created_at) 
             VALUES (?, ?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE table_key = VALUES(table_key)`,
            [restaurant.restaurant_id, tableNo, tableKey]
          );

          console.log(`   ✓ ${tableNo}: ${tableKey}`);
          totalCreated++;
        } catch (error) {
          console.log(`   ✗ ${tableNo}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Generated ${totalCreated} table QR codes successfully`);

    // Step 4: Display test URLs
    console.log('\n' + '='.repeat(80));
    console.log('📱 TEST QR URLs (copy and paste into browser):');
    console.log('='.repeat(80));

    const [tableQRs] = await connection.query(
      `SELECT tq.table_qr_id, tq.table_no, tq.table_key, r.restaurant_name
       FROM table_qr_tbl tq
       JOIN restaurant_tbl r ON tq.restaurant_id = r.restaurant_id
       WHERE tq.is_active = 1
       ORDER BY r.restaurant_id, tq.table_no
       LIMIT 10`
    );

    for (const qr of tableQRs) {
      console.log(`\n${qr.restaurant_name} - ${qr.table_no}:`);
      console.log(`http://localhost:3001/qr/${qr.table_key}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Setup complete! You can now test the QR ordering system.');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupTableQR().catch(error => {
  console.error('Failed to setup Table QR system:', error);
  process.exit(1);
});
