const bcrypt = require('bcrypt');
const password = 'Knoweb@123';
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(hash);
});
