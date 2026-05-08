const jwt = require('jsonwebtoken');

const SECRET  = process.env.JWT_SECRET || 'fleetpro_secret_change_in_prod';
const EXPIRES = process.env.JWT_EXPIRES_IN || '30d';

exports.signToken = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES });

exports.verifyToken = (token) =>
  jwt.verify(token, SECRET);
