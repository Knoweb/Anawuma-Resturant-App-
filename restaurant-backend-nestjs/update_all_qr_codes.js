const mysql = require('mysql2/promise');

async function updateAllQRCodes() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
  });

  const IP_ADDRESS = '192.168.8.127';
  const PORT = '3001';

  console.log('🔧 Updating ALL QR Code URLs to use IP address...\n');

  // Update all QR codes from localhost to IP address
  const [result] = await conn.execute(`
    UPDATE table_qr_tbl 
    SET qr_url = REPLACE(qr_url, 'http://localhost:${PORT}', 'http://${IP_ADDRESS}:${PORT}')
    WHERE qr_url LIKE '%localhost%'
  `);

  console.log(`✅ Updated ${result.affectedRows} table QR codes\n`);

  // Also update room QR codes if they exist
  const [roomResult] = await conn.execute(`
    UPDATE room_qr_tbl 
    SET qr_url = REPLACE(qr_url, 'http://localhost:${PORT}', 'http://${IP_ADDRESS}:${PORT}')
    WHERE qr_url LIKE '%localhost%'
  `);

  console.log(`✅ Updated ${roomResult.affectedRows} room QR codes\n`);

  // Show all QR codes for Grand Palace Hotel
  const [qrCodes] = await conn.execute(`
    SELECT 
      tq.table_no,
      tq.qr_url,
      tq.table_key,
      r.restaurant_name
    FROM table_qr_tbl tq
    JOIN restaurant_tbl r ON tq.restaurant_id = r.restaurant_id
    WHERE r.restaurant_id = 13
    ORDER BY tq.table_no
  `);

  if (qrCodes.length > 0) {
    console.log('📱 Grand Palace Hotel QR Codes:\n');
    qrCodes.forEach((qr) => {
      console.log(`  ${qr.table_no}:`);
      console.log(`    URL: http://${IP_ADDRESS}:${PORT}/qr/${qr.table_key}`);
      console.log('');
    });
  }

  await conn.end();
  
  console.log('✅ All QR codes updated successfully!');
  console.log('   New QR codes will now be generated with IP address.');
}

updateAllQRCodes().catch(console.error);
