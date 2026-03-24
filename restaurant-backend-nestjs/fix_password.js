const mysql = require('mysql2/promise');

const correctHash = '$2y$10$DU0q4B7eZk2JP/m.RETSRuclfkCVLy9fvKgA3t4ffFjeb.6/c7YYa';

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant_db'
  });

  console.log('Updating password to:', correctHash);
  
  await conn.execute(
    'UPDATE admin_tbl SET password = ? WHERE email = ?',
    [correctHash, 'testadmin@restaurant.com']
  );

  const [rows] = await conn.execute(
    'SELECT email, password, role FROM admin_tbl WHERE email = ?',
    ['testadmin@restaurant.com']
  );

  console.log('Updated admin:', rows[0]);
  
  await conn.end();
})();
