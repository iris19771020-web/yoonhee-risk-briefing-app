exports.handler = async function () {
    const token = process.env.FINNHUB_TOKEN;
  
    if (!token) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "FINNHUB_TOKEN missing" }),
      };
    }
  
    async function getJson(url) {
      const res = await fetch(url);
      return await res.json();
    }
  
    async function getQuote(symbol) {
      const data = await getJson(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`
      );
  
      return {
        symbol,
        price: data.c,
        changePct: data.dp,
      };
    }
  
    try {
      const [qqq, spy, soxx, uso, vixy] = await Promise.all([
        getQuote("QQQ"),
        getQuote("SPY"),
        getQuote("SOXX"),
        getQuote("USO"),
        getQuote("VIXY"),
      ]);
  
      const fx = await getJson("https://open.er-api.com/v6/latest/USD");
  
      const news = await getJson(
        `https://finnhub.io/api/v1/news?category=general&token=${token}`
      );
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          updatedAt: new Date(),
          quotes: { qqq, spy, soxx, uso, vixy },
          usdkrw: fx.rates.KRW,
          news: news.slice(0, 30),
        }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      };
    }
  };