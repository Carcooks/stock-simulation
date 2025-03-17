const axios = require('axios');

const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function updateStep() {
  try {
    const configUrl = `${BASE_URL}/config/stockState`;
    const { data } = await axios.get(`${configUrl}?key=${API_KEY}`);
    const currentStep = parseInt(data.fields.currentStep?.integerValue || "0");
    const newStep = (currentStep + 1) % 15; // 0~14 반복

    await axios.patch(`${configUrl}?key=${API_KEY}`, {
      fields: { currentStep: { integerValue: newStep.toString() } }
    }, { headers: { 'Content-Type': 'application/json' } });

    console.log(`Step updated to ${newStep}`);
  } catch (error) {
    console.error('Error:', error.message, error.response?.data);
    process.exit(1);
  }
}

updateStep();