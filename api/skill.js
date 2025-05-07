const axios = require('axios');
require('dotenv').config();

module.exports = async (req, res) => {
  try {
    const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID;
    const API_KEY = process.env.GOOGLE_API_KEY;
    const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    const { utterance, user } = req.body.userRequest || {};
    if (!utterance || !user || !user.id) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const userId = user.id;
    const userDocUrl = `${BASE_URL}/users/${userId}`;
    const pricesUrl = `${BASE_URL}/stock_prices/prices`;
    const configUrl = `${BASE_URL}/config/stockState`;

    const { data: configData } = await axios.get(`${configUrl}?key=${API_KEY}`);
    const currentStep = parseInt(configData.fields.currentStep?.integerValue || "0");

    const { data: pricesData } = await axios.get(`${pricesUrl}?key=${API_KEY}`);
    const prices = pricesData.fields;

    if (utterance === '시작') {
      const payload = {
        fields: {
          balance: { integerValue: "5000000" },
          stocks: { mapValue: { fields: {} } }
        }
      };
      try {
        await axios.post(`${BASE_URL}/users?documentId=${userId}&key=${API_KEY}`, payload);
      } catch (err) {
        if (err.response?.status === 409) {
          await axios.patch(`${userDocUrl}?key=${API_KEY}`, payload);
        } else throw err;
      }
      return res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: "🎉 계좌가 초기화되었어요!\n💵 500만 원이 지급되었습니다!"
            }
          }]
        }
      });
    }

    if (utterance === '내 계좌 확인') {
      const { data: userData } = await axios.get(`${userDocUrl}?key=${API_KEY}`);
      const balance = parseInt(userData.fields.balance?.integerValue || "0");
      const stocks = userData.fields.stocks?.mapValue?.fields || {};
      let totalValue = balance;
      let stockList = [];

      for (const [stock, { integerValue }] of Object.entries(stocks)) {
        const qty = parseInt(integerValue);
        const price = parseInt(prices[stock]?.arrayValue?.values[currentStep]?.integerValue || "0");
        totalValue += price * qty;
        stockList.push(`${stock}: ${qty}주`);
      }

      const msg = `💰 총자산: ${totalValue.toLocaleString()}원\n💵 잔액: ${balance.toLocaleString()}원`
        + (stockList.length > 0 ? `\n📦 보유 주식:\n` + stockList.join('\n') : `\n📦 보유 주식 없음`);

      return res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{ simpleText: { text: msg } }]
        }
      });
    }

    if (utterance === '현재 주가 알려줘') {
      let list = Object.entries(prices)
        .map(([stock, { arrayValue }]) => {
          const price = parseInt(arrayValue.values[currentStep].integerValue || "0");
          return `${stock}: ${price.toLocaleString()}원`;
        })
        .join('\n');

      return res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: `📈 현재 주가 목록\n\n${list}`
            }
          }]
        }
      });
    }

    if (utterance.includes('매수')) {
      const match = utterance.match(/(\S+)\s+(\d+)주\s*매수/);
      if (!match) return res.status(400).json({ error: '예: "건오중공업 10주 매수"' });

      const [_, stockId, quantity] = match;
      const qty = parseInt(quantity);
      const priceArray = prices[stockId]?.arrayValue?.values.map(v => parseInt(v.integerValue));
      if (!priceArray) return res.status(400).json({ error: `${stockId} 주가 정보 없음` });

      const price = priceArray[currentStep];
      const { data: userData } = await axios.get(`${userDocUrl}?key=${API_KEY}`);
      const balance = parseInt(userData.fields.balance?.integerValue || "0");

      if (balance < price * qty) return res.status(400).json({ error: '잔액 부족' });

      const newBalance = balance - price * qty;
      const currentStocks = userData.fields.stocks?.mapValue?.fields || {};
      const newQty = (parseInt(currentStocks[stockId]?.integerValue || "0") + qty).toString();

      await axios.patch(`${userDocUrl}?key=${API_KEY}`, {
        fields: {
          balance: { integerValue: newBalance.toString() },
          stocks: {
            mapValue: {
              fields: {
                ...currentStocks,
                [stockId]: { integerValue: newQty }
              }
            }
          }
        }
      });

      return res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: `✅ ${stockId} ${qty}주 매수 완료!\n💸 매수가: ${price.toLocaleString()}원`
            }
          }]
        }
      });
    }

    if (utterance.includes('매도')) {
      const match = utterance.match(/(\S+)\s+(\d+)주\s*매도/);
      if (!match) return res.status(400).json({ error: '예: "건오중공업 5주 매도"' });

      const [_, stockId, quantity] = match;
      const qty = parseInt(quantity);
      const priceArray = prices[stockId]?.arrayValue?.values.map(v => parseInt(v.integerValue));
      if (!priceArray) return res.status(400).json({ error: `${stockId} 주가 정보 없음` });

      const price = priceArray[currentStep];
      const { data: userData } = await axios.get(`${userDocUrl}?key=${API_KEY}`);
      const currentStocks = userData.fields.stocks?.mapValue?.fields || {};
      const ownedQty = parseInt(currentStocks[stockId]?.integerValue || "0");

      if (ownedQty < qty) return res.status(400).json({ error: '보유 주식 부족' });

      const newQty = ownedQty - qty;
      const revenue = price * qty;
      const balance = parseInt(userData.fields.balance?.integerValue || "0");
      const updatedStocks = { ...currentStocks };

      if (newQty === 0) {
        delete updatedStocks[stockId];
      } else {
        updatedStocks[stockId] = { integerValue: newQty.toString() };
      }

      const newBalance = balance + revenue;

      await axios.patch(`${userDocUrl}?key=${API_KEY}`, {
        fields: {
          balance: { integerValue: newBalance.toString() },
          stocks: {
            mapValue: {
              fields: updatedStocks
            }
          }
        }
      });

      return res.status(200).json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: `💵 ${stockId} ${qty}주 매도 완료!\n판매가: ${price.toLocaleString()}원`
            }
          }]
        }
      });
    }

    return res.status(400).json({ error: '지원하지 않는 명령입니다.' });

  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      error: 'Server error',
      details: err.message,
      firestoreError: err.response?.data || null
    });
  }
};
