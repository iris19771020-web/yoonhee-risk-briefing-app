import { useEffect, useMemo, useState } from "react";

type MarketItem = {
  symbol: string;
  label: string;
  price: number | null;
  changePct: number | null;
};

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
};

const MARKET_CONFIG = [
  { key: "qqq", symbol: "qqq.us", label: "나스닥100 대용 (QQQ)" },
  { key: "spy", symbol: "spy.us", label: "S&P500 대용 (SPY)" },
  { key: "soxx", symbol: "soxx.us", label: "반도체 체온계 (SOXX)" },
  { key: "uso", symbol: "uso.us", label: "원유 체온계 (USO)" },
  { key: "vixy", symbol: "vixy.us", label: "공포 체온계 (VIXY)" },
] as const;

const SAMPLE_MARKET: Record<string, MarketItem> = {
  qqq: { symbol: "qqq.us", label: "나스닥100 대용 (QQQ)", price: 518.42, changePct: -0.84 },
  spy: { symbol: "spy.us", label: "S&P500 대용 (SPY)", price: 582.11, changePct: -0.36 },
  soxx: { symbol: "soxx.us", label: "반도체 체온계 (SOXX)", price: 232.77, changePct: -1.12 },
  uso: { symbol: "uso.us", label: "원유 체온계 (USO)", price: 78.94, changePct: 1.48 },
  vixy: { symbol: "vixy.us", label: "공포 체온계 (VIXY)", price: 48.15, changePct: 1.25 },
};

const SAMPLE_GEO_NEWS: NewsItem[] = [
  {
    title: "중동 긴장 고조로 국제유가 상승 압력 확대",
    link: "#",
    pubDate: "샘플 데이터",
  },
  {
    title: "미국 대외정책 불확실성 확대, 글로벌 증시 변동성 경계",
    link: "#",
    pubDate: "샘플 데이터",
  },
  {
    title: "이란 관련 지정학 리스크, 위험자산 선호 약화 가능성",
    link: "#",
    pubDate: "샘플 데이터",
  },
];

const SAMPLE_ECON_NEWS: NewsItem[] = [
  {
    title: "연준 금리 경로 불확실성 지속, 기술주 부담 요인 점검",
    link: "#",
    pubDate: "샘플 데이터",
  },
  {
    title: "미국 인플레이션 둔화 기대와 경기 우려가 혼재",
    link: "#",
    pubDate: "샘플 데이터",
  },
  {
    title: "국채금리와 달러 흐름이 위험자산 분위기 좌우",
    link: "#",
    pubDate: "샘플 데이터",
  },
];

const SAMPLE_SEMI_NEWS: NewsItem[] = [
  {
    title: "AI 수요 기대에도 반도체주는 단기 변동성 확대",
    link: "#",
    pubDate: "샘플 데이터",
  },
  {
    title: "미국 기술주 약세가 반도체 투자심리에 부담",
    link: "#",
    pubDate: "샘플 데이터",
  },
  {
    title: "메모리 업황 기대는 남아 있지만 단기 조정 경계",
    link: "#",
    pubDate: "샘플 데이터",
  },
];

function formatPrice(v: number | null) {
  if (v === null || Number.isNaN(v)) return "-";
  return v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatPct(v: number | null) {
  if (v === null || Number.isNaN(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function pctColor(v: number | null) {
  if (v === null || Number.isNaN(v)) return "#d4d4d8";
  if (v > 0) return "#34d399";
  if (v < 0) return "#f87171";
  return "#d4d4d8";
}

async function fetchTextViaProxy(url: string) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`요청 실패`);
  return await res.text();
}

async function fetchStooqDaily(symbol: string) {
  const url = `https://stooq.com/q/d/l/?s=${symbol}&i=d`;
  const text = await fetchTextViaProxy(url);

  const lines = text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  if (lines.length < 3) throw new Error("가격 데이터 부족");

  const rows = lines
    .slice(1)
    .map((line) => line.split(",").map((x) => x.trim()))
    .filter((cols) => cols.length >= 5);

  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  const lastClose = Number(last[4]);
  const prevClose = Number(prev[4]);

  if (Number.isNaN(lastClose) || Number.isNaN(prevClose) || prevClose === 0) {
    throw new Error("가격 파싱 실패");
  }

  return {
    price: lastClose,
    changePct: ((lastClose - prevClose) / prevClose) * 100,
  };
}

async function fetchUsdKrw() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await res.json();

  if (!res.ok || data?.result !== "success") {
    throw new Error("환율 요청 실패");
  }

  return {
    rate: typeof data?.rates?.KRW === "number" ? data.rates.KRW : null,
    updatedAt: data?.time_last_update_utc || "-",
  };
}

async function fetchGoogleNews(query: string) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=en-US&gl=US&ceid=US:en`;

  const xmlText = await fetchTextViaProxy(rssUrl);
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");
  const items = Array.from(xml.querySelectorAll("item")).slice(0, 5);

  return items.map((item) => ({
    title: item.querySelector("title")?.textContent || "",
    link: item.querySelector("link")?.textContent || "#",
    pubDate: item.querySelector("pubDate")?.textContent || "",
  }));
}

export default function App() {
  const [market, setMarket] = useState<Record<string, MarketItem>>({});
  const [usdkrw, setUsdKrw] = useState<number | null>(null);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string>("-");
  const [geoNews, setGeoNews] = useState<NewsItem[]>([]);
  const [econNews, setEconNews] = useState<NewsItem[]>([]);
  const [semiNews, setSemiNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("-");
  const [usingSample, setUsingSample] = useState(false);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      setUsingSample(false);

      const marketResults = await Promise.all(
        MARKET_CONFIG.map(async (item) => {
          const data = await fetchStooqDaily(item.symbol);
          return [
            item.key,
            {
              symbol: item.symbol,
              label: item.label,
              price: data.price,
              changePct: data.changePct,
            } as MarketItem,
          ] as const;
        })
      );

      const marketMap = Object.fromEntries(marketResults);

      const [fx, g1, g2, g3] = await Promise.all([
        fetchUsdKrw(),
        fetchGoogleNews("geopolitics iran israel trump oil war middle east"),
        fetchGoogleNews("fed inflation cpi economy recession treasury yields"),
        fetchGoogleNews("semiconductor AI Nvidia TSMC chip memory"),
      ]);

      setMarket(marketMap);
      setUsdKrw(fx.rate);
      setFxUpdatedAt(fx.updatedAt);
      setGeoNews(g1);
      setEconNews(g2);
      setSemiNews(g3);
      setUpdatedAt(new Date().toLocaleString("ko-KR"));
    } catch {
      setUsingSample(true);
      setError("실시간 연동이 막혀 샘플 데이터로 표시 중이야.");

      setMarket(SAMPLE_MARKET);
      setUsdKrw(1368.4);
      setFxUpdatedAt("샘플 데이터");
      setGeoNews(SAMPLE_GEO_NEWS);
      setEconNews(SAMPLE_ECON_NEWS);
      setSemiNews(SAMPLE_SEMI_NEWS);
      setUpdatedAt(new Date().toLocaleString("ko-KR"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const thermometer = useMemo(() => {
    const qqq = market.qqq?.changePct ?? 0;
    const soxx = market.soxx?.changePct ?? 0;
    const uso = market.uso?.changePct ?? 0;
    const vixy = market.vixy?.changePct ?? 0;
    const fx = usdkrw ?? 0;

    let score = 0;

    if (qqq <= -1) score += 2;
    else if (qqq < 0) score += 1;
    else if (qqq >= 1) score -= 1;

    if (soxx <= -1) score += 2;
    else if (soxx < 0) score += 1;
    else if (soxx >= 1) score -= 1;

    if (uso >= 1) score += 1;
    if (vixy >= 1) score += 2;
    else if (vixy > 0) score += 1;

    if (fx >= 1370) score += 1;
    else if (fx > 0 && fx <= 1330) score -= 1;

    if (score >= 5) return { emoji: "🔴", label: "위험", rise: 25, flat: 25, fall: 50 };
    if (score >= 2) return { emoji: "🟡", label: "경계", rise: 35, flat: 30, fall: 35 };
    return { emoji: "🟢", label: "안정", rise: 45, flat: 30, fall: 25 };
  }, [market, usdkrw]);

  const morningBrief = useMemo(() => {
    const lines: string[] = [];

    const qqq = market.qqq?.changePct ?? 0;
    const soxx = market.soxx?.changePct ?? 0;
    const uso = market.uso?.changePct ?? 0;
    const vixy = market.vixy?.changePct ?? 0;

    if (qqq < 0) lines.push("미국 기술주 분위기가 약해졌고");
    else if (qqq > 0) lines.push("미국 기술주 분위기는 비교적 견조했고");

    if (soxx < 0) lines.push("반도체 체온계도 눌린 모습이어서");
    else if (soxx > 0) lines.push("반도체 체온계는 나쁘지 않았고");

    if (uso > 0.8) lines.push("원유 체온계가 올라 지정학·인플레 부담이 남아 있어");
    if (vixy > 0.8) lines.push("공포 체온계도 올라 변동성 경계가 필요해");
    if ((usdkrw ?? 0) >= 1370) lines.push("환율도 높은 편이라 외국인 수급엔 부담이 될 수 있어");

    if (lines.length === 0) {
      return "밤사이 글로벌 변수는 비교적 차분했어. 오늘은 과도한 공포보다 실제 장 흐름을 보면서 대응하면 돼.";
    }

    return `${lines.join(" ")}. 오늘 한국장은 추격매수보다 눌림 확인이 먼저야.`;
  }, [market, usdkrw]);

  const sectorImpact = useMemo(() => {
    let semi = "중립";
    let auto = "중립";

    const qqq = market.qqq?.changePct ?? 0;
    const soxx = market.soxx?.changePct ?? 0;
    const uso = market.uso?.changePct ?? 0;
    const vixy = market.vixy?.changePct ?? 0;

    if (qqq < 0 || soxx < 0) semi = "단기 부담";
    if (qqq > 0.8 && soxx > 0.8) semi = "우호적";

    if ((usdkrw ?? 0) >= 1360) auto = "환율 측면 일부 우호";
    if (uso > 1.2 || vixy > 1.2) auto = "시장 전체 변동성은 경계";

    return { semi, auto };
  }, [market, usdkrw]);

  function MetricCard({
    title,
    price,
    pct,
    note,
  }: {
    title: string;
    price: number | null;
    pct: number | null;
    note: string;
  }) {
    return (
      <div
        style={{
          background: "#171717",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 800 }}>{formatPrice(price)}</div>
        <div style={{ color: pctColor(pct), fontWeight: 700, marginTop: 6 }}>{formatPct(pct)}</div>
        <div style={{ fontSize: 12, color: "#71717a", marginTop: 8 }}>{note}</div>
      </div>
    );
  }

  function NewsBlock({ title, items }: { title: string; items: NewsItem[] }) {
    return (
      <div
        style={{
          background: "#171717",
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{title}</div>
        {items.length === 0 ? (
          <div style={{ color: "#a1a1aa", fontSize: 14 }}>불러오는 중이거나 표시할 뉴스가 아직 없어.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item, idx) => (
              <a
                key={`${item.link}-${idx}`}
                href={item.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "white",
                  textDecoration: "none",
                  background: "#111111",
                  borderRadius: 12,
                  padding: 12,
                  border: "1px solid #262626",
                }}
              >
                <div style={{ fontWeight: 700, lineHeight: 1.5 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 8 }}>{item.pubDate}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#34d399" }}>
            윤희 글로벌 리스크 브리핑 앱
          </div>
          <div style={{ color: "#a1a1aa", marginTop: 8 }}>
            삼성전자 / 현대차 매수 판단을 위한 아침 참고용 브리핑
          </div>
          <div style={{ color: "#71717a", marginTop: 6, fontSize: 13 }}>
            마지막 갱신: {updatedAt} {loading ? "· 불러오는 중..." : ""}
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#3a1111",
              color: "#fecaca",
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              border: "1px solid #7f1d1d",
            }}
          >
            {error}
          </div>
        )}

        {usingSample && (
          <div
            style={{
              background: "#1f2937",
              color: "#cbd5e1",
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              border: "1px solid #374151",
            }}
          >
            현재 StackBlitz에서 외부 연동이 막혀서 샘플 데이터로 보여주고 있어.  
            앱 구조와 문구는 이 상태로 확인하면 돼.
          </div>
        )}

        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 18,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, color: "#93c5fd", marginBottom: 10 }}>
            🌍 오늘 글로벌 시장 요약
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.7 }}>{morningBrief}</div>
          <div style={{ marginTop: 14, color: "#cbd5e1", lineHeight: 1.7 }}>
            한국시장 영향: <b>반도체 {sectorImpact.semi}</b> / <b>자동차 {sectorImpact.auto}</b>
          </div>
        </div>

        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 18,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, color: "#fcd34d", marginBottom: 8 }}>📊 한국 증시 체온계</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            현재 시장 온도: {thermometer.emoji} {thermometer.label}
          </div>
          <div style={{ color: "#d4d4d8", marginTop: 12, lineHeight: 1.8 }}>
            상승 가능성 {thermometer.rise}% · 보합 가능성 {thermometer.flat}% · 하락 가능성{" "}
            {thermometer.fall}%
          </div>
          <div style={{ color: "#a1a1aa", marginTop: 10, fontSize: 13 }}>
            기준: 나스닥100 대용, 반도체 대용, 원유 대용, 공포 대용, 환율
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <MetricCard
            title="나스닥100 대용"
            price={market.qqq?.price ?? null}
            pct={market.qqq?.changePct ?? null}
            note="QQQ ETF"
          />
          <MetricCard
            title="S&P500 대용"
            price={market.spy?.price ?? null}
            pct={market.spy?.changePct ?? null}
            note="SPY ETF"
          />
          <MetricCard
            title="반도체 체온계"
            price={market.soxx?.price ?? null}
            pct={market.soxx?.changePct ?? null}
            note="SOXX ETF"
          />
          <MetricCard
            title="원유 체온계"
            price={market.uso?.price ?? null}
            pct={market.uso?.changePct ?? null}
            note="USO ETF"
          />
          <MetricCard
            title="공포 체온계"
            price={market.vixy?.price ?? null}
            pct={market.vixy?.changePct ?? null}
            note="VIXY ETF"
          />

          <div
            style={{
              background: "#171717",
              border: "1px solid #2a2a2a",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 6 }}>USD/KRW 환율</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>
              {usdkrw ? usdkrw.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "-"}
            </div>
            <div style={{ color: "#d4d4d8", fontWeight: 700, marginTop: 6 }}>일일 기준 참고값</div>
            <div style={{ fontSize: 12, color: "#71717a", marginTop: 8 }}>
              마지막 환율 업데이트: {fxUpdatedAt}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              background: "#171717",
              border: "1px solid #2a2a2a",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>한국 증시 영향</div>

            <div
              style={{
                background: "#111111",
                border: "1px solid #262626",
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>반도체</div>
              <div style={{ color: "#d4d4d8", lineHeight: 1.7 }}>
                나스닥100 대용: {formatPct(market.qqq?.changePct ?? null)} / 반도체 체온계:{" "}
                {formatPct(market.soxx?.changePct ?? null)}
                <br />→ 삼성전자 영향: <b>{sectorImpact.semi}</b>
              </div>
            </div>

            <div
              style={{
                background: "#111111",
                border: "1px solid #262626",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>자동차</div>
              <div style={{ color: "#d4d4d8", lineHeight: 1.7 }}>
                환율: {usdkrw ? usdkrw.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "-"} / 원유
                체온계: {formatPct(market.uso?.changePct ?? null)}
                <br />→ 현대차 영향: <b>{sectorImpact.auto}</b>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#171717",
              border: "1px solid #2a2a2a",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>오늘 행동 가이드</div>
            <div style={{ lineHeight: 1.9, color: "#e4e4e7" }}>
              <b>삼성전자</b>
              <br />- 눌림 확인 후 접근
              <br />- SOXX/QQQ 약세면 추격매수 금지
              <br />- 지정학 리스크 강하면 분할만
              <br />
              <br />
              <b>현대차</b>
              <br />- 삼성보다 후순위
              <br />- 환율은 우호적일 수 있지만 원유 급등은 부담
              <br />- 좋은 자리만 천천히 접근
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <NewsBlock title="지정학 리스크 뉴스" items={geoNews} />
          <NewsBlock title="경제 뉴스" items={econNews} />
          <NewsBlock title="반도체/AI 뉴스" items={semiNews} />
        </div>
      </div>
    </div>
  );
}