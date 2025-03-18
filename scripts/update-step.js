const axios = require('axios');

console.log('Process env - FIRESTORE_PROJECT_ID:', process.env.FIRESTORE_PROJECT_ID);
console.log('Process env - GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '****' : 'undefined');

const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID || 'knu-dent-stock-exchange-84d53'; // 임시 하드코딩
const API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyAyh7iymvLYejCLrBG_iIVX2_dYBlHSZ98'; // 임시 하드코딩

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
    throw error;
  }
}

updateStep().catch(console.error);