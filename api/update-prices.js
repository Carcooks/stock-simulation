const axios = require('axios');
require('dotenv').config();

const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID || "knu-dent-stock-exchange-84d53";
const API_KEY = process.env.GOOGLE_API_KEY || "AIzaSyAyh7iymvLYejCLrBG_iIVX2_dYBlHSZ98";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

module.exports = async (req, res) => {
  try {
    const { data: stateData } = await axios.get(`${BASE_URL}/config/stockState?key=${API_KEY}`);
    const currentStep = parseInt(stateData.fields.currentStep?.integerValue || 0);
    const { data: pricesData } = await axios.get(`${BASE_URL}/stock_prices/prices?key=${API_KEY}`);
    const stockPrices = pricesData.fields;
    const maxStep = stockPrices[Object.keys(stockPrices)[0]].arrayValue.values.length;
    const newStep = (currentStep + 1) % maxStep;

    await axios.patch(`${BASE_URL}/config/stockState?key=${API_KEY}`, {
      fields: { currentStep: { integerValue: newStep } }
    });

    res.status(200).json({ message: `업데이트 완료: ${newStep}` });
  } catch (error) {
    res.status(500).json({ error: '업데이트 실패', details: error.message });
  }
};