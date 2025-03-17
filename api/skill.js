const axios = require('axios');
require('dotenv').config();

module.exports = async (req, res) => {
  try {
    const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!PROJECT_ID || !API_KEY) throw new Error('Missing env vars');
    const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    const { utterance, user } = req.body.userRequest || {};
    if (!utterance || !user || !user.id) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    if (utterance === '시작') {
      const userCollectionUrl = `${BASE_URL}/users`;
      const payload = {
        fields: { balance: { integerValue: "5000000" } }
      };
      console.log('Request:', { method: 'POST', url: userCollectionUrl, data: payload });

      const response = await axios.post(`${userCollectionUrl}?key=${API_KEY}&documentId=${user.id}`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Response:', response.data);
      return res.status(200).json({ message: '500만 원이 지급되었습니다!' });
    }
    return res.status(400).json({ error: 'Unsupported utterance' });
  } catch (error) {
    console.error('Error:', error.message, error.response?.data);
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
      firestoreError: error.response?.data || 'Unknown Firestore error'
    });
  }
};