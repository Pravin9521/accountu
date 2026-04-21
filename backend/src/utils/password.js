const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const hashPassword = async (plainPassword) => {
  if (!plainPassword) {
    throw new Error('Password is required');
  }

  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

const comparePassword = async (plainPassword, passwordHash) => {
  if (!plainPassword || !passwordHash) {
    return false;
  }

  return bcrypt.compare(plainPassword, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword,
};

