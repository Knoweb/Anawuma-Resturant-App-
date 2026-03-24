const mysql = require('mysql2/promise');

async function checkQRSystem() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
  });

  console.log('=== QR CODE SYSTEM VERIFICATION ===\n');

  // Check QR codes
  const [qr] = await conn.execute(
    'SELECT * FROM table_qr_tbl WHERE restaurant_id = 13'
  );
  console.log('✅ QR Codes:', qr.length);

  // Check menus
  const [menus] = await conn.execute(
    'SELECT * FROM menu_tbl WHERE restaurant_id = 13'
  );
  console.log('✅ Menus:', menus.length);

  // Check categories
  const [cats] = await conn.execute(
    'SELECT * FROM category_tbl WHERE restaurant_id = 13'
  );
  console.log('✅ Categories:', cats.length);

  // Check food items
  const [items] = await conn.execute(
    'SELECT * FROM food_items_tbl WHERE restaurant_id = 13'
  );
  console.log('✅ Food Items:', items.length);

  // Check orders
  const [orders] = await conn.execute(
    'SELECT * FROM kitchen_orders_tbl WHERE restaurant_id = 13'
  );
  console.log('✅ Orders Placed:', orders.length);

  console.log('\n📊 DETAILED QR CODE INFO:');
  qr.forEach(q => {
    console.log(`\n  🏷️  Table ${q.table_no}:`);
    console.log(`     URL: ${q.qr_url}`);
    console.log(`     Key: ${q.table_key}`);
  });

  if (orders.length > 0) {
    console.log('\n📦 RECENT ORDERS:');
    orders.forEach(order => {
      console.log(`\n  Order #${order.order_id}:`);
      console.log(`     Table: ${order.table_no}`);
      console.log(`     Status: ${order.order_status}`);
      console.log(`     Total: Rs. ${order.total_amount}`);
      console.log(`     Time: ${order.created_at}`);
    });
  }

  await conn.end();
}

checkQRSystem().catch(console.error);
