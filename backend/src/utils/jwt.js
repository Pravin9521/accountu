const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.warn('[JWT] JWT_SECRET not set. Using an insecure default secret for development.');
    return 'insecure-dev-secret-change-me';
  }

  return secret;
};

const signToken = (payload, options = {}) => {
  const secret = getJwtSecret();
  const defaultOptions = {
    expiresIn: '7d',
  };

  return jwt.sign(payload, secret, { ...defaultOptions, ...options });
};

const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

module.exports = {
  signToken,
  verifyToken,
};

