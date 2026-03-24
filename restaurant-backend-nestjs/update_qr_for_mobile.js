const mysql = require('mysql2/promise');

async function updateQRForMobile() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
  });

  const IP_ADDRESS = '192.168.8.127';
  const PORT = '3001';

  console.log('🔧 Updating QR Code URL for mobile access...\n');

  // Update QR code URL from localhost to IP address
  await conn.execute(`
    UPDATE table_qr_tbl 
    SET qr_url = REPLACE(qr_url, 'localhost', '${IP_ADDRESS}')
    WHERE restaurant_id = 13
  `);

  // Get updated QR code
  const [qr] = await conn.execute(
    'SELECT * FROM table_qr_tbl WHERE restaurant_id = 13'
  );

  console.log('✅ QR Code Updated!\n');
  qr.forEach(q => {
    console.log(`📱 Table ${q.table_no}:`);
    console.log(`   URL: ${q.qr_url}\n`);
  });

  console.log('🔗 Full URL to test in browser:');
  console.log(`   http://${IP_ADDRESS}:${PORT}/qr/${qr[0].table_key}\n`);

  await conn.end();
}

updateQRForMobile().catch(console.error);
