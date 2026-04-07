
import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

async function fixTable() {
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

    console.log('Detecting columns...');
    const result = await connection.query("DESCRIBE food_items_tbl");
    const columns = (result as any[]).map(c => c.Field);

    const neededColumns = [
      { name: 'image_url_1', sql: 'ALTER TABLE food_items_tbl ADD COLUMN image_url_1 VARCHAR(255) NULL' },
      { name: 'image_url_2', sql: 'ALTER TABLE food_items_tbl ADD COLUMN image_url_2 VARCHAR(255) NULL' },
      { name: 'image_url_3', sql: 'ALTER TABLE food_items_tbl ADD COLUMN image_url_3 VARCHAR(255) NULL' },
      { name: 'image_url_4', sql: 'ALTER TABLE food_items_tbl ADD COLUMN image_url_4 VARCHAR(255) NULL' },
      { name: 'video_link', sql: 'ALTER TABLE food_items_tbl ADD COLUMN video_link VARCHAR(255) NULL' },
      { name: 'blog_link', sql: 'ALTER TABLE food_items_tbl ADD COLUMN blog_link VARCHAR(255) NULL' },
      { name: 'menu_id', sql: 'ALTER TABLE food_items_tbl ADD COLUMN menu_id INT NULL' },
    ];

    for (const col of neededColumns) {
      if (!columns.includes(col.name)) {
        console.log(`Adding column: ${col.name}`);
        try {
           await connection.query(col.sql);
        } catch (e) {
           console.error(`Error adding column ${col.name}:`, e.message);
        }
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }

    console.log('Fix complete.');
    await connection.close();
  } catch (error) {
    console.error('Error fixing DB:', error);
  }
}

fixTable();
