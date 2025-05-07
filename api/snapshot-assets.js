// /api/snapshot-assets.js
const axios = require('axios');
require('dotenv').config();

module.exports = async (req, res) => {
  try {
    const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
    const API_KEY = process.env.GOOGLE_API_KEY;
    const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    const pricesRes = await axios.get(`${BASE_URL}/stock_prices/prices?key=${API_KEY}`);
    const configRes = await axios.get(`${BASE_URL}/config/stockState?key=${API_KEY}`);
    const currentStep = parseInt(configRes.data.fields.currentStep.integerValue);
    const prices = pricesRes.data.fields;

    const usersRes = await axios.get(`${BASE_URL}/users?key=${API_KEY}`);
    const documents = usersRes.data.documents || [];

    const snapshot = {};

    for (const doc of documents) {
      const userId = doc.name.split('/').pop();
      const balance = parseInt(doc.fields.balance.integerValue);
      const stocks = doc.fields.stocks?.mapValue?.fields || {};

      let asset = balance;
      for (const [stock, info] of Object.entries(stocks)) {
        const quantity = parseInt(info.integerValue);
        const priceArray = prices[stock]?.arrayValue?.values;
        if (priceArray && priceArray[currentStep]) {
          const currentPrice = parseInt(priceArray[currentStep].integerValue);
          asset += currentPrice * quantity;
        }
      }

      snapshot[userId] = { totalAsset: asset };
    }

    return res.status(200).json(snapshot);

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      error: 'Snapshot Error',
      details: err.message,
      firestoreError: err.response?.data || null
    });
  }
};
