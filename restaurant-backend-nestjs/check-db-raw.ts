
import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

async function checkTable() {
  try {
    const connection = await createConnection({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      synchronize: false,
    });

    const result = await connection.query("DESCRIBE food_items_tbl");
    console.log('--- TABLE DEFINITION ---');
    console.table(result);

    const data = await connection.query("SELECT * FROM food_items_tbl ORDER BY food_items_id DESC LIMIT 5");
    console.log('--- RAW DATA ---');
    console.log(JSON.stringify(data, null, 2));

    await connection.close();
  } catch (error) {
    console.error('Error connecting to DB:', error);
  }
}

checkTable();
