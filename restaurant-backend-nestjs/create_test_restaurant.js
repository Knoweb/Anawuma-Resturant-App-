const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createTestRestaurant() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
  });

  try {
    // Create password hash for restaurant
    const restaurantPasswordHash = await bcrypt.hash('palace123', 10);
    const restaurantPhpHash = restaurantPasswordHash.replace(/^\$2b\$/, '$2y$');

    // Create a new restaurant
    const [restaurantResult] = await conn.execute(
      `INSERT INTO restaurant_tbl (
        restaurant_name, 
        email, 
        contact_number, 
        address, 
        subscription_status,
        subscription_expiry_date,
        opening_time,
        closing_time,
        password,
        currency_id,
        country_id,
        package_id,
        enable_housekeeping,
        enable_steward,
        enable_kds,
        enable_reports,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        'Grand Palace Hotel',
        'admin@grandpalace.com',
        '+1-555-9876',
        '789 Luxury Avenue, New York, USA',
        'active',
        '2027-12-31 23:59:59',
        '08:00:00',
        '22:00:00',
        restaurantPhpHash,
        1, // currency_id
        164, // country_id
        3, // package_id
        1, // enable_housekeeping
        1, // enable_steward
        1, // enable_kds
        1  // enable_reports
      ]
    );

    const restaurantId = restaurantResult.insertId;
    console.log('✅ Restaurant created with ID:', restaurantId);
    console.log('   Name: Grand Palace Hotel');
    console.log('   Email: admin@grandpalace.com');

    // Create bcrypt hash for password 'palace123'
    const passwordHash = await bcrypt.hash('palace123', 10);
    // Convert to PHP format
    const phpHash = passwordHash.replace(/^\$2b\$/, '$2y$');

    // Create admin for this restaurant
    const [adminResult] = await conn.execute(
      `INSERT INTO admin_tbl (
        restaurant_id,
        email,
        password,
        role
      ) VALUES (?, ?, ?, ?)`,
      [
        restaurantId,
        'palace@admin.com',
        phpHash,
        'admin'
      ]
    );

    console.log('\n✅ Admin created with ID:', adminResult.insertId);
    console.log('   Email: palace@admin.com');
    console.log('   Password: palace123');
    console.log('   Role: admin');

    console.log('\n🎉 Success! You can now login with:');
    console.log('   Email: palace@admin.com');
    console.log('   Password: palace123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

createTestRestaurant();
