const mysql = require('mysql2/promise');

async function checkOrders() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
  });

  console.log('🔍 CHECKING LATEST ORDERS...\n');

  const [orders] = await conn.execute(`
    SELECT 
      o.order_id,
      o.table_no,
      o.status,
      o.total_amount,
      o.special_instructions,
      o.created_at,
      COUNT(oi.item_id) as item_count
    FROM kitchen_orders_tbl o
    LEFT JOIN kitchen_order_items_tbl oi ON o.order_id = oi.order_id
    WHERE o.restaurant_id = 13
    GROUP BY o.order_id
    ORDER BY o.created_at DESC
    LIMIT 5
  `);

  if (orders.length === 0) {
    console.log('❌ No orders found yet. Place an order first!');
  } else {
    console.log(`✅ Found ${orders.length} order(s):\n`);
    orders.forEach((order, idx) => {
      console.log(`${idx + 1}. Order #${order.order_id}`);
      console.log(`   Table: ${order.table_no}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Items: ${order.item_count}`);
      console.log(`   Total: Rs. ${order.total_amount}`);
      console.log(`   Notes: ${order.special_instructions || 'None'}`);
      console.log(`   Time: ${order.created_at}`);
      console.log('');
    });
  }

  await conn.end();
}

checkOrders().catch(console.error);
