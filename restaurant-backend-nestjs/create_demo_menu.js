const mysql = require('mysql2/promise');

async function createDemoMenu() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
  });

  try {
    const restaurantId = 13; // Grand Palace Hotel

    // Create a menu
    const [menuResult] = await conn.execute(
      'INSERT INTO menu_tbl (restaurant_id, menu_name, description) VALUES (?, ?, ?)',
      [restaurantId, 'Main Menu', 'Our signature dishes']
    );
    const menuId = menuResult.insertId;
    console.log('✅ Menu created with ID:', menuId);

    // Create categories
    const categories = [
      ['Appetizers', 'Start your meal right'],
      ['Main Course', 'Our specialty dishes'],
      ['Desserts', 'Sweet endings'],
      ['Beverages', 'Refreshing drinks']
    ];

    const categoryIds = [];
    for (const [name, desc] of categories) {
      const [catResult] = await conn.execute(
        'INSERT INTO category_tbl (restaurant_id, menu_id, category_name, description) VALUES (?, ?, ?, ?)',
        [restaurantId, menuId, name, desc]
      );
      categoryIds.push(catResult.insertId);
      console.log(`✅ Category created: ${name} (ID: ${catResult.insertId})`);
    }

    // Create food items
    const foodItems = [
      // Appetizers
      ['Spring Rolls', 'Crispy vegetable rolls', 450, categoryIds[0]],
      ['Chicken Wings', 'Spicy buffalo wings', 650, categoryIds[0]],
      ['Garlic Bread', 'Toasted with garlic butter', 350, categoryIds[0]],
      
      // Main Course
      ['Grilled Chicken', 'Marinated grilled chicken breast', 1200, categoryIds[1]],
      ['Beef Steak', 'Premium ribeye steak', 2500, categoryIds[1]],
      ['Pasta Carbonara', 'Creamy pasta with bacon', 950, categoryIds[1]],
      ['Vegetable Curry', 'Mixed vegetables in curry sauce', 850, categoryIds[1]],
      
      // Desserts
      ['Chocolate Cake', 'Rich chocolate layered cake', 550, categoryIds[2]],
      ['Ice Cream', 'Vanilla, chocolate or strawberry', 400, categoryIds[2]],
      ['Tiramisu', 'Classic Italian dessert', 600, categoryIds[2]],
      
      // Beverages
      ['Fresh Juice', 'Orange, pineapple or mango', 300, categoryIds[3]],
      ['Iced Coffee', 'Cold brew coffee', 350, categoryIds[3]],
      ['Soft Drinks', 'Coca Cola, Sprite, Fanta', 200, categoryIds[3]],
      ['Fresh Lime', 'Refreshing lime juice', 250, categoryIds[3]]
    ];

    for (const [name, desc, price, categoryId] of foodItems) {
      await conn.execute(
        `INSERT INTO food_items_tbl 
        (restaurant_id, category_id, food_items_name, description, price, currency_id) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [restaurantId, categoryId, name, desc, price, 1] // currency_id 1
      );
    }
    console.log(`✅ Created ${foodItems.length} food items`);

    console.log('\n🎉 Demo menu created successfully for Grand Palace Hotel!');
    console.log('\n📱 Test the customer menu at:');
    console.log('   http://localhost:3001/qr/8c64ea2868a2923fcbf676d9f26cddde1343dfb9a7afe20daefe86af4c290aa0');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await conn.end();
  }
}

createDemoMenu();
