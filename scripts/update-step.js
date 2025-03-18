const axios = require('axios');

const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
console.log('Environment - FIRESTORE_PROJECT_ID:', process.env.FIRESTORE_PROJECT_ID);
console.log('Environment - GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '****' : 'undefined');
if (!PROJECT_ID || !API_KEY) throw new Error('Missing env vars');

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function updateStep() {
  try {
    console.log('Fetching current step from:', `${BASE_URL}/config/stockState`);
    const { data } = await axios.get(`${BASE_URL}/config/stockState?key=${API_KEY}`);
    console.log('Current data:', data);
    const currentStep = parseInt(data.fields.currentStep?.integerValue || "0");
    const newStep = (currentStep + 1) % 15;

    const payload = {
      fields: {
        currentStep: { integerValue: newStep.toString() }
      }
    };
    console.log('PATCH payload:', payload);

    await axios.patch(`${BASE_URL}/config/stockState?key=${API_KEY}`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Step updated to ${newStep}`);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error; // 오류를 상위로 전달
  }
}

updateStep().catch(console.error);