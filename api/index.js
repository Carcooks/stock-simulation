module.exports = async (req, res) => {
  res.status(200).json({
    message: '📈 주식 시뮬레이터 API 정상 작동 중!',
    endpoints: [
      '/api/skill',           // 카카오톡용
      '/api/update-prices'    // step 증가용
    ]
  });
};
