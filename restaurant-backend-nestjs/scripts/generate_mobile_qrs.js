const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const QRCode = require('qrcode');

async function main() {
  const outputDir = 'd:/Downloads/restaurant-app-main/qr_exports';
  const baseUrl = 'http://192.168.8.127:3001/qr/';

  fs.mkdirSync(outputDir, { recursive: true });

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'restaurant_db',
  });

  const [rows] = await conn.execute(
    'SELECT table_qr_id, restaurant_id, table_no, table_key FROM table_qr_tbl WHERE is_active = 1 ORDER BY table_qr_id DESC LIMIT 30',
  );

  const lines = [];

  for (const row of rows) {
    const url = `${baseUrl}${row.table_key}`;
    const safeTable = String(row.table_no || 'table').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `qr_r${row.restaurant_id}_${safeTable}_${row.table_qr_id}.png`;
    const filePath = path.join(outputDir, fileName);

    await QRCode.toFile(filePath, url, {
      width: 700,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    lines.push(`${row.table_qr_id}\tR${row.restaurant_id}\t${row.table_no}\t${url}\t${filePath}`);
  }

  const urlsFile = path.join(outputDir, 'qr_urls.txt');
  fs.writeFileSync(urlsFile, lines.join('\n'));

  await conn.end();

  console.log(`QR_EXPORT_DIR=${outputDir}`);
  console.log(`QR_COUNT=${rows.length}`);
  console.log(`QR_URLS_FILE=${urlsFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
