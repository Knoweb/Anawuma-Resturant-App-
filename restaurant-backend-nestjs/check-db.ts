
import { createConnection } from 'typeorm';
import { FoodItem } from './src/food-items/entities/food-item.entity';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

async function checkDb() {
  try {
    const connection = await createConnection({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [FoodItem],
      synchronize: false,
    });

    const foodItems = await connection.getRepository(FoodItem).find({
      order: { foodItemId: 'DESC' },
      take: 5
    });

    console.log('--- LATEST 5 FOOD ITEMS ---');
    foodItems.forEach(item => {
      console.log(`ID: ${item.foodItemId} | Name: ${item.itemName}`);
      console.log(`  imageUrl1: ${item.imageUrl1}`);
      console.log(`  imageUrl2: ${item.imageUrl2}`);
      console.log(`  imageUrl3: ${item.imageUrl3}`);
      console.log(`  imageUrl4: ${item.imageUrl4}`);
      console.log(`  imageUrl: ${item['imageUrl']}`); // check if exists dynamically
      console.log(`  itemImage: ${item['itemImage']}`);
      console.log('---------------------------');
    });

    await connection.close();
  } catch (error) {
    console.error('Error connecting to DB:', error);
  }
}

checkDb();
