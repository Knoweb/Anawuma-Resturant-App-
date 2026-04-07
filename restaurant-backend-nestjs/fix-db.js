
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixTable() {
  let connection;
  try {
    console.log('Connecting to DB...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    console.log('Detecting columns...');
    const [result] = await connection.query("DESCRIBE food_items_tbl");
    const columns = result.map(c => c.Field);

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
  } catch (error) {
    console.error('Error fixing DB:', error);
  } finally {
    if (connection) await connection.end();
  }
}

fixTable();
