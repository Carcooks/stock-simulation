const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: "Stock Simulator API is running!" });
});

module.exports = app;