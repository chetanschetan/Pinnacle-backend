const bcrypt = require('bcrypt');

const generateHash = async () => {
  const plainPassword = 'Pinnacle@123'; // Jo password aapko rakhna ho
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
  console.log("Hashed Password:", hashedPassword);
};

generateHash();