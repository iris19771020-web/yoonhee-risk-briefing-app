exports.handler = async function () {
    const token = process.env.FINNHUB_TOKEN;
  
    if (!token) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "FINNHUB_TOKEN is missing" }),
      };
    }
  
    async function getJson(url) {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Request failed: ${url}`);
      }
      return await res.json();
    }
  
    async function getQuote(symbol) {
      const data = await getJson(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`
      );
  
      if (data.error) {
        throw new Error(`${symbol}: ${data.error}`);
      }
  
      return {
        symbol,
        price: typeof data.c === "number" ? data.c : null,
        changePct: typeof data.dp === "number" ? data.dp : null,
      };
    }
  
    try {
      const [qqq, spy, soxx, uso, vixy, fxData, newsData] = await Promise.all([
        getQuote("QQQ"),
        getQuote("SPY"),
        getQuote("SOXX"),
        getQuote("USO"),
        getQuote("VIXY"),
        getJson("https://open.er-api.com/v6/latest/USD"),
        getJson(`https://finnhub.io/api/v1/news?category=general&token=${token}`),
      ]);
  
      const usdkrw = fxData?.rates?.KRW ?? null;
      const fxUpdatedAt = fxData?.time_last_update_utc ?? null;
  
      const news = Array.isArray(newsData)
        ? newsData.slice(0, 30).map((item) => ({
            headline: item.headline || "",
            source: item.source || "",
            url: item.url || "",
            datetime: item.datetime || 0,
            summary: item.summary || "",
          }))
        : [];
  
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
        body: JSON.stringify({
          updatedAt: new Date().toISOString(),
          quotes: { qqq, spy, soxx, uso, vixy },
          usdkrw,
          fxUpdatedAt,
          news,
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.message || "Unknown error",
        }),
      };
    }
  };