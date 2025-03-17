const axios = require('axios');
require('dotenv').config();

const PROJECT_ID = process.env.FIRESTORE_PROJECT_ID || "knu-dent-stock-exchange-84d53";
const API_KEY = process.env.GOOGLE_API_KEY || "AIzaSyAyh7iymvLYejCLrBG_iIVX2_dYBlHSZ98";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/knu-dent-stock-exchange-84d53/databases/(default)/documents`;

async function getStockPrices() {
  const { data } = await axios.get(`${BASE_URL}/stock_prices/prices?key=${API_KEY}`);
  return data.fields || {};
}

async function getCurrentStep() {
  const { data } = await axios.get(`${BASE_URL}/config/stockState?key=${API_KEY}`);
  return data.fields.currentStep?.integerValue || 0;
}

module.exports = async (req, res) => {
  const userRequest = req.body.userRequest.utterance;
  const userId = req.body.userRequest.user.id;
  const stockPrices = await getStockPrices();
  const currentStep = await getCurrentStep();

  let responseText = "";

  if (userRequest === "시작") {
    const userPath = `${BASE_URL}/users/${userId}?key=${API_KEY}`;
    const { data } = await axios.get(userPath).catch(() => ({ data: null }));
    if (!data) {
      await axios.patch(userPath, {
        fields: { balance: { integerValue: 5000000 }, stocks: { mapValue: { fields: {} } } }
      });
      responseText = "500만 원이 지급되었습니다!";
    } else {
      responseText = "이미 계정이 존재합니다.";
    }
  } else if (userRequest === "주가") {
    const prices = Object.entries(stockPrices).map(([symbol, priceList]) => {
      return `${symbol}: ${priceList.arrayValue.values[currentStep].integerValue}원`;
    }).join("\n");
    responseText = `현재 주가:\n${prices}`;
  } else if (userRequest === "내 계좌 상태") {
    const userPath = `${BASE_URL}/users/${userId}?key=${API_KEY}`;
    const { data } = await axios.get(userPath).catch(() => ({ data: null }));
    let userData = data ? data.fields : { balance: { integerValue: 5000000 }, stocks: { mapValue: { fields: {} } } };
    if (!data) await axios.patch(userPath, { fields: userData });
    const balance = parseInt(userData.balance.integerValue);
    const stockList = userData.stocks.mapValue.fields || {};
    let stocksText = "없음";
    let totalAssets = balance;
    if (Object.keys(stockList).length > 0) {
      stocksText = Object.entries(stockList)
        .map(([stockId, amount]) => {
          const price = parseInt(stockPrices[stockId].arrayValue.values[currentStep].integerValue);
          totalAssets += price * amount.integerValue;
          return `${stockId}: ${amount.integerValue}주 (${price}원)`;
        })
        .join("\n");
    }
    responseText = `잔고: ${balance}원\n보유 주식:\n${stocksText}\n총자산: ${totalAssets}원`;
  } else if (userRequest.startsWith("매수 ")) {
    const [, stockId, amount] = userRequest.split(" ");
    responseText = await handleBuy(userId, stockId, parseInt(amount), stockPrices, currentStep);
  } else if (userRequest.startsWith("매도 ")) {
    const [, stockId, amount] = userRequest.split(" ");
    responseText = await handleSell(userId, stockId, parseInt(amount), stockPrices, currentStep);
  } else if (userRequest === "뉴스") {
    const { data } = await axios.get(`${BASE_URL}/news?key=${API_KEY}`);
    const newsList = (data.documents || [])
      .filter(doc => parseInt(doc.fields.step.integerValue) === currentStep)
      .slice(0, 5)
      .map(doc => `${doc.fields.title.stringValue}: ${doc.fields.content.stringValue}`)
      .join("\n") || "없음";
    responseText = `최신 뉴스 (회차 ${currentStep}):\n${newsList}`;
  } else {
    responseText = "명령어: \"시작\", \"주가\", \"내 계좌 상태\", \"매수 [주식명] [수량]\", \"매도 [주식명] [수량]\", \"뉴스\"";
  }

  res.json({
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text: responseText } }]
    }
  });
};

async function handleBuy(userId, stockId, amount, stockPrices, currentStep) {
  if (!stockPrices[stockId]) return "존재하지 않는 주식입니다!";
  const currentPrice = parseInt(stockPrices[stockId].arrayValue.values[currentStep].integerValue);
  const cost = currentPrice * amount;

  const userPath = `${BASE_URL}/users/${userId}?key=${API_KEY}`;
  const { data } = await axios.get(userPath).catch(() => ({ data: null }));
  let userData = data ? data.fields : { balance: { integerValue: 5000000 }, stocks: { mapValue: { fields: {} } } };
  if (!data) await axios.patch(userPath, { fields: userData });

  const balance = parseInt(userData.balance.integerValue);
  if (balance >= cost) {
    userData.balance.integerValue = (balance - cost).toString();
    userData.stocks.mapValue.fields[stockId] = { integerValue: ((parseInt(userData.stocks.mapValue.fields[stockId]?.integerValue) || 0) + amount).toString() };
    await axios.patch(userPath, { fields: userData });
    return `${stockId} ${amount}주 매수 완료! 가격: ${currentPrice}`;
  }
  return "자금 부족!";
}

async function handleSell(userId, stockId, amount, stockPrices, currentStep) {
  if (!stockPrices[stockId]) return "존재하지 않는 주식입니다!";
  const currentPrice = parseInt(stockPrices[stockId].arrayValue.values[currentStep].integerValue);

  const userPath = `${BASE_URL}/users/${userId}?key=${API_KEY}`;
  const { data } = await axios.get(userPath).catch(() => ({ data: null }));
  let userData = data ? data.fields : { balance: { integerValue: 5000000 }, stocks: { mapValue: { fields: {} } } };
  if (!data) await axios.patch(userPath, { fields: userData });

  const owned = parseInt(userData.stocks.mapValue.fields[stockId]?.integerValue || 0);
  if (owned >= amount) {
    userData.balance.integerValue = (parseInt(userData.balance.integerValue) + currentPrice * amount).toString();
    userData.stocks.mapValue.fields[stockId].integerValue = (owned - amount).toString();
    if (userData.stocks.mapValue.fields[stockId].integerValue === "0") delete userData.stocks.mapValue.fields[stockId];
    await axios.patch(userPath, { fields: userData });
    return `${stockId} ${amount}주 매도 완료! 가격: ${currentPrice}`;
  }
  return "보유 주식 부족!";
}