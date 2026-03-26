const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('Knoweb@123', 10);
console.log('Valid Hash:', hash);
console.log('Comparing my test hash:', bcrypt.compareSync('Knoweb@123', hash));
console.log('Comparing user hash:', bcrypt.compareSync('Knoweb@123', '$2a$10$CXG2ebmn09CInaIELk4.gO2g07PpdRQX/W41JxCb7PIAqDvWa7EZS'));

