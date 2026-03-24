require('dotenv').config();
const mysql = require('mysql2/promise');

async function findRestaurantAdmins() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'restaurant_db',
    });

    console.log('✅ Connected to database\n');

    console.log('📋 Available Restaurant Admin Accounts:\n');
    
    const [admins] = await connection.execute(`
      SELECT 
        a.admin_id,
        a.email,
        a.role,
        a.restaurant_id,
        r.restaurant_name
      FROM admin_tbl a
      LEFT JOIN restaurant_tbl r ON a.restaurant_id = r.restaurant_id
      WHERE a.restaurant_id IS NOT NULL
      ORDER BY a.admin_id
    `);

    if (admins.length === 0) {
      console.log('❌ No restaurant admins found!\n');
      console.log('💡 You can create one using the admin interface or run a SQL command.');
    } else {
      console.table(admins);
      console.log('\n✅ Use one of these admin accounts to login and test the Housekeeping module.');
      console.log('\n📝 If you don\'t know the password, you may need to reset it or create a new admin.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

findRestaurantAdmins();
