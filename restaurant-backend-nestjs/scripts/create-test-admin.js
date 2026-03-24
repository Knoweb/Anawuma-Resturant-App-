require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestAdmin() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
    });

    console.log('✅ Connected to database\n');

    const testEmail = 'test@housekeeping.com';
    const testPassword = 'test123';
    const restaurantId = 1; // SeaSpray Café

    // Hash the password
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Check if admin already exists
    const [existing] = await connection.execute(
      'SELECT admin_id FROM admin_tbl WHERE email = ?',
      [testEmail]
    );

    if (existing.length > 0) {
      // Update existing admin
      await connection.execute(
        'UPDATE admin_tbl SET password = ?, role = ?, restaurant_id = ? WHERE email = ?',
        [hashedPassword, 'admin', restaurantId, testEmail]
      );
      console.log('✅ Updated existing admin account\n');
    } else {
      // Create new admin
      await connection.execute(
        'INSERT INTO admin_tbl (email, password, role, restaurant_id) VALUES (?, ?, ?, ?)',
        [testEmail, hashedPassword, 'admin', restaurantId]
      );
      console.log('✅ Created new admin account\n');
    }

    console.log('🎉 Test Admin Account Ready!\n');
    console.log('┌─────────────────────────────────────┐');
    console.log('│  Login Credentials                  │');
    console.log('├─────────────────────────────────────┤');
    console.log(`│  Email:    ${testEmail.padEnd(20)}│`);
    console.log(`│  Password: ${testPassword.padEnd(20)}│`);
    console.log(`│  Restaurant: SeaSpray Café (ID: 1)  │`);
    console.log('└─────────────────────────────────────┘\n');
    
    console.log('📝 Next Steps:');
    console.log('1. Go to: http://localhost:3001/login');
    console.log(`2. Login with: ${testEmail} / ${testPassword}`);
    console.log('3. Navigate to: Room Service → Messages');
    console.log('4. The Housekeeping module should now work!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestAdmin();
