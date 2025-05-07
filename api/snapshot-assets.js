const axios = require('axios');
require('dotenv').config();

module.exports = async (req, res) => {
  try {
    const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
    const API_KEY = process.env.GOOGLE_API_KEY;
    const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    // 현재 step 불러오기
    const { data: configData } = await axios.get(`${BASE_URL}/config/stockState?key=${API_KEY}`);
    const currentStep = parseInt(configData.fields.currentStep.integerValue);

    // 주가 정보 불러오기
    const { data: priceData } = await axios.get(`${BASE_URL}/stock_prices/prices?key=${API_KEY}`);
    const prices = priceData.fields;

    // 사용자 목록 조회
    const { data: userListData } = await axios.get(`${BASE_URL}/users?key=${API_KEY}`);
    const documents = userListData.documents || [];

    for (const doc of documents) {
      const path = doc.name;
      const userId = path.split('/').pop();
      const fields = doc.fields;
      const balance = parseInt(fields.balance?.integerValue || "0");
      const stocks = fields.stocks?.mapValue?.fields || {};

      let totalAssets = balance;
      for (const stockId in stocks) {
        const quantity = parseInt(stocks[stockId].integerValue || "0");
        const stockPriceList = prices[stockId]?.arrayValue?.values || [];
        const stockPrice = parseInt(stockPriceList[currentStep]?.integerValue || "0");
        totalAssets += quantity * stockPrice;
      }

      const payload = {
        fields: {
          totalAssets: { integerValue: totalAssets.toString() }
        }
      };

      // 저장
      await axios.patch(`${BASE_URL}/snapshots/step_${currentStep}/users/${userId}?key=${API_KEY}`, payload);
    }

    return res.status(200).json({ message: "✅ 스냅샷 저장 완료" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      error: 'Server error',
      details: err.message,
      firestoreError: err.response?.data || null
    });
  }
};
