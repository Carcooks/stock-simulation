const axios = require('axios');
require('dotenv').config();

module.exports = async (req, res) => {
  try {
    const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
    const API_KEY = process.env.GOOGLE_API_KEY;
    const configUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/config/stockState`;

    const { data } = await axios.get(`${configUrl}?key=${API_KEY}`);
    const currentStep = parseInt(data.fields.currentStep?.integerValue || "0");
    const nextStep = currentStep + 1;

    await axios.patch(`${configUrl}?key=${API_KEY}`, {
      fields: {
        currentStep: { integerValue: nextStep.toString() }
      }
    });

    res.status(200).json({ message: `currentStep가 ${nextStep}으로 증가되었습니다.` });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: 'Step 증가 실패',
      details: err.message
    });
  }
};
