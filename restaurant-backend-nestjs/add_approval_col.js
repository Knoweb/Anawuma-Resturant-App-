const m = require('mysql2/promise');
(async () => {
  const c = await m.createConnection({ host: 'localhost', user: 'root', password: '', database: 'restaurant_db' });
  const sql = "ALTER TABLE restaurant_tbl ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER closing_time";
  await c.query(sql);
  console.log('approval_status column added successfully');
  const [rows] = await c.query("SHOW COLUMNS FROM restaurant_tbl LIKE 'approval_status'");
  console.log(JSON.stringify(rows));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
