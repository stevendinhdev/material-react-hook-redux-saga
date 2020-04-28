const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = (req, res, next) => {
	//get the token from the header if present
  const token = req.headers["x-access-token"] || req.headers["authorization"].split(' ');
  //if no token found, return response (without going to the next middelware)
  if (!token) return res.status(401).send("Access denied. No token provided.");

  try {
    //if can verify the token, set req.user and pass to next middleware
    const decoded = jwt.verify(token[1], config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    //if invalid token
    res.status(400).send("Invalid token.");
  }
}