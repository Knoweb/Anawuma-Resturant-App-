require('dotenv').config();
const mysql = require('mysql2/promise');
const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

async function updateQRCodesWithIP() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
    });

    console.log('✅ Connected to database');
    
    const localIP = getLocalIPAddress();
    console.log(`\n📱 Your Local IP: ${localIP}`);
    console.log(`🌐 Frontend URL: http://${localIP}:3001`);
    
    // Update all existing QR codes
    console.log('\n🔄 Updating QR codes to use local IP...');
    
    const [result] = await connection.execute(`
      UPDATE room_qr_tbl 
      SET qr_url = CONCAT('http://${localIP}:3001/room/', room_key)
      WHERE qr_url LIKE '%localhost%' OR qr_url IS NULL
    `);
    
    console.log(`✅ Updated ${result.affectedRows} QR codes`);
    
    // Show sample QR codes
    console.log('\n📊 Sample QR URLs:');
    const [qrCodes] = await connection.execute(`
      SELECT room_no, qr_url 
      FROM room_qr_tbl 
      LIMIT 5
    `);
    
    console.table(qrCodes);
    
    console.log(`\n✅ Setup Complete!`);
    console.log(`\n📱 HOW TO TEST FROM PHONE:`);
    console.log(`   1. Connect phone to same WiFi as laptop`);
    console.log(`   2. On laptop, open: http://${localIP}:3001`);
    console.log(`   3. Go to: Room Service > All Room QR Codes`);
    console.log(`   4. Download a QR code`);
    console.log(`   5. Scan with phone camera`);
    console.log(`   6. Phone will open: http://${localIP}:3001/room/...`);
    console.log(`\n🔧 IMPORTANT: Make sure Windows Firewall allows port 3001!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateQRCodesWithIP();
