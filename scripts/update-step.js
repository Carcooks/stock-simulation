const axios = require('axios');

const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function updateStep() {
  try {
    console.log('PROJECT_ID:', PROJECT_ID);  // 디버깅
    console.log('API_KEY:', API_KEY);        // 디버깅
    if (!PROJECT_ID || !API_KEY) throw new Error('Missing env vars');

    const configUrl = `${BASE_URL}/config/stockState`;
    console.log('Fetching current step from:', configUrl);
    const { data } = await axios.get(`${configUrl}?key=${API_KEY}`);
    console.log('Current data:', data);
    const currentStep = parseInt(data.fields.currentStep?.integerValue || "0");
    const newStep = (currentStep + 1) % 15;

    const payload = {
      fields: {
        currentStep: { integerValue: newStep.toString() }
      }
    };
    console.log('PATCH payload:', payload);

    await axios.patch(`${configUrl}?key=${API_KEY}`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Step updated to ${newStep}`);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

updateStep();