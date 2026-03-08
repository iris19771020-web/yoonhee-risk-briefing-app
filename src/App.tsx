import { useEffect, useMemo, useState } from "react";

type Quote = {
  symbol: string;
  price: number | null;
  changePct: number | null;
};

type NewsItem = {
  headline: string;
  source: string;
  url: string;
  datetime: number;
  summary: string;
};

type ApiData = {
  updatedAt: string;
  quotes: {
    qqq: Quote;
    spy: Quote;
    soxx: Quote;
    uso: Quote;
    vixy: Quote;
  };
  usdkrw: number | null;
  fxUpdatedAt: string | null;
  news: NewsItem[];
};

function formatPrice(v: number | null) {
  if (v === null || Number.isNaN(v)) return "-";
  return v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function formatPct(v: number | null) {
  if (v === null || Number.isNaN(v)) return "-";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function colorPct(v: number | null) {
  if (v === null || Number.isNaN(v)) return "#d4d4d8";
  if (v > 0) return "#34d399";
  if (v < 0) return "#f87171";
  return "#d4d4d8";
}

function formatDateTime(unixSec: number) {
  if (!unixSec) return "-";
  return new Date(unixSec * 1000).toLocaleString("ko-KR");
}

function keywordFilter(items: NewsItem[], keywords: string[]) {
  const lower = keywords.map((k) => k.toLowerCase());
  return items.filter((item) => {
    const text = `${item.headline} ${item.summary} ${item.source}`.toLowerCase();
    return lower.some((kw) => text.includes(kw));
  });
}

function translateHeadlineToKorean(input: string) {
  if (!input) return "";

  let text = input;

  const phraseMap: Array<[RegExp, string]> = [
    [/Trump rejects settling Iran war/gi, "트럼프, 이란 전쟁 타협 거부"],
    [/Trump tells Britain he does not need its help to win Iran war/gi, "트럼프, 영국 도움 없이도 이란 전쟁 승리 가능 주장"],
    [/As war spreads, airline pilots contend with drones, missiles - and stress/gi, "전쟁 확산에 항공 조종사들, 드론·미사일·스트레스에 직면"],
    [/Kuwait cuts oil production as Strait of Hormuz closure disrupts global energy market/gi, "호르무즈 해협 차질로 쿠웨이트 원유 생산 축소"],
    [/White House halts security bulletin warning of Iran-related threats/gi, "백악관, 이란 관련 위협 경보 중단"],
    [/Australia weighing requests for assistance from countries attacked by Iran/gi, "호주, 이란 공격 받은 국가들의 지원 요청 검토"],
    [/Four killed in Beirut hotel strike, Israel says it targeted Iranian commanders/gi, "베이루트 호텔 공습으로 4명 사망, 이스라엘은 이란 지휘관 겨냥 주장"],

    [/rejects/gi, "거부"],
    [/reject/gi, "거부"],
    [/settling/gi, "타협"],
    [/settlement/gi, "합의"],
    [/prospect/gi, "가능성"],
    [/killing/gi, "제거"],
    [/killed/gi, "사망"],
    [/leaders/gi, "지도부"],
    [/leader/gi, "지도자"],

    [/war/gi, "전쟁"],
    [/strike/gi, "공습"],
    [/strikes/gi, "공습"],
    [/attack/gi, "공격"],
    [/attacks/gi, "공격"],
    [/missile/gi, "미사일"],
    [/missiles/gi, "미사일"],
    [/drone/gi, "드론"],
    [/drones/gi, "드론"],
    [/security/gi, "안보"],
    [/threat/gi, "위협"],
    [/threats/gi, "위협"],
    [/defense/gi, "방어"],
    [/military/gi, "군사"],

    [/oil production/gi, "원유 생산"],
    [/oil/gi, "원유"],
    [/energy market/gi, "에너지 시장"],
    [/market/gi, "시장"],
    [/markets/gi, "시장"],
    [/global/gi, "글로벌"],
    [/inflation/gi, "인플레이션"],
    [/recession/gi, "경기침체"],
    [/yield/gi, "금리"],
    [/yields/gi, "금리"],
    [/economy/gi, "경제"],
    [/economic/gi, "경제"],
    [/tariff/gi, "관세"],
    [/sanction/gi, "제재"],
    [/sanctions/gi, "제재"],

    [/semiconductor/gi, "반도체"],
    [/chip/gi, "칩"],
    [/chips/gi, "칩"],
    [/memory/gi, "메모리"],
    [/foundry/gi, "파운드리"],
    [/AI/gi, "AI"],
    [/Nvidia/gi, "엔비디아"],
    [/TSMC/gi, "TSMC"],

    [/Trump/gi, "트럼프"],
    [/Iran/gi, "이란"],
    [/Israel/gi, "이스라엘"],
    [/Britain/gi, "영국"],
    [/Kuwait/gi, "쿠웨이트"],
    [/Australia/gi, "호주"],
    [/Beirut/gi, "베이루트"],
    [/White House/gi, "백악관"],
    [/Middle East/gi, "중동"],
    [/China/gi, "중국"],
    [/Taiwan/gi, "대만"],
    [/Reuters/gi, "로이터"],
    [/CNBC/gi, "CNBC"],
  ];

  for (const [pattern, replacement] of phraseMap) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s{2,}/g, " ").trim();
}

export default function App() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/.netlify/functions/briefing");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "브리핑 데이터를 불러오지 못했어.");
      }

      setData(json);
    } catch (e: any) {
      setError(e.message || "오류가 발생했어.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const geopoliticalNews = useMemo(() => {
    if (!data) return [];
    return keywordFilter(data.news, [
      "iran",
      "israel",
      "war",
      "missile",
      "middle east",
      "oil",
      "trump",
      "tariff",
      "sanction",
      "china",
      "taiwan",
    ]).slice(0, 4);
  }, [data]);

  const economyNews = useMemo(() => {
    if (!data) return [];
    return keywordFilter(data.news, [
      "inflation",
      "cpi",
      "ppi",
      "fed",
      "rate",
      "yield",
      "payroll",
      "economy",
      "recession",
      "treasury",
      "market",
      "stocks",
    ]).slice(0, 4);
  }, [data]);

  const semiNews = useMemo(() => {
    if (!data) return [];
    return keywordFilter(data.news, [
      "semiconductor",
      "chip",
      "ai",
      "nvidia",
      "tsmc",
      "memory",
      "foundry",
      "tech",
    ]).slice(0, 4);
  }, [data]);

  const thermometer = useMemo(() => {
    if (!data) {
      return { emoji: "🟡", label: "경계", rise: 35, flat: 30, fall: 35, score: 2 };
    }

    const qqq = data.quotes.qqq.changePct ?? 0;
    const soxx = data.quotes.soxx.changePct ?? 0;
    const uso = data.quotes.uso.changePct ?? 0;
    const vixy = data.quotes.vixy.changePct ?? 0;
    const fx = data.usdkrw ?? 0;
    const geoCount = geopoliticalNews.length;

    let score = 0;

    if (qqq <= -1.0) score += 2;
    else if (qqq < 0) score += 1;
    else if (qqq >= 1.0) score -= 1;

    if (soxx <= -1.0) score += 2;
    else if (soxx < 0) score += 1;
    else if (soxx >= 1.0) score -= 1;

    if (uso >= 1.0) score += 1;
    if (vixy >= 1.0) score += 2;
    else if (vixy > 0) score += 1;

    if (fx >= 1370) score += 1;
    else if (fx <= 1330 && fx > 0) score -= 1;

    if (geoCount >= 2) score += 1;

    if (score >= 5) return { emoji: "🔴", label: "위험", rise: 25, flat: 25, fall: 50, score };
    if (score >= 2) return { emoji: "🟡", label: "경계", rise: 35, flat: 30, fall: 35, score };
    return { emoji: "🟢", label: "안정", rise: 45, flat: 30, fall: 25, score };
  }, [data, geopoliticalNews.length]);

  const morningBrief = useMemo(() => {
    if (!data) return "데이터를 불러오는 중이야.";

    const lines: string[] = [];

    if ((data.quotes.qqq.changePct ?? 0) < 0) lines.push("미국 기술주 분위기가 약해졌고");
    else if ((data.quotes.qqq.changePct ?? 0) > 0) lines.push("미국 기술주 분위기는 비교적 견조했고");

    if ((data.quotes.soxx.changePct ?? 0) < 0) lines.push("반도체 체온계도 눌린 모습이어서");
    else if ((data.quotes.soxx.changePct ?? 0) > 0) lines.push("반도체 체온계는 나쁘지 않았고");

    if ((data.quotes.uso.changePct ?? 0) > 0.8) lines.push("원유 대용지표가 올라 전쟁·인플레 부담이 남아 있어");
    if ((data.quotes.vixy.changePct ?? 0) > 0.8) lines.push("공포 체온계도 올라 변동성 경계가 필요해");
    if ((data.usdkrw ?? 0) >= 1370) lines.push("환율 레벨도 높은 편이라 외국인 수급엔 부담이 될 수 있어");

    if (lines.length === 0) {
      return "밤사이 글로벌 변수는 비교적 차분했어. 오늘은 과도한 공포보다 실제 장 흐름을 보면서 대응하면 돼.";
    }

    return `${lines.join(" ")}. 오늘 한국장은 추격매수보다 눌림 확인이 먼저야.`;
  }, [data]);

  const sectorImpact = useMemo(() => {
    if (!data) return { semi: "중립", auto: "중립" };

    let semi = "중립";
    let auto = "중립";

    if ((data.quotes.qqq.changePct ?? 0) < 0 || (data.quotes.soxx.changePct ?? 0) < 0) {
      semi = "단기 부담";
    }
    if ((data.quotes.qqq.changePct ?? 0) > 0.8 && (data.quotes.soxx.changePct ?? 0) > 0.8) {
      semi = "우호적";
    }

    if ((data.usdkrw ?? 0) >= 1360) auto = "환율 측면 일부 우호";
    if ((data.quotes.uso.changePct ?? 0) > 1.2 || (data.quotes.vixy.changePct ?? 0) > 1.2) {
      auto = "시장 전체 변동성은 경계";
    }

    return { semi, auto };
  }, [data]);

  const samsungGuide = useMemo(() => {
    if (!data) return "데이터 확인 후 판단";
    const qqq = data.quotes.qqq.changePct ?? 0;
    const soxx = data.quotes.soxx.changePct ?? 0;
    const risk = thermometer.label;

    if (risk === "위험" || soxx <= -2 || qqq <= -1.2) {
      return "추격매수 금지. 눌림 확인 후 소액 분할만.";
    }
    if (risk === "경계") {
      return "성급하게 따라가지 말고, 장중 눌림과 반등 확인 후 접근.";
    }
    return "시장 분위기 자체는 나쁘지 않지만, 여전히 분할 접근이 유리해.";
  }, [data, thermometer.label]);

  const hyundaiGuide = useMemo(() => {
    if (!data) return "데이터 확인 후 판단";
    const uso = data.quotes.uso.changePct ?? 0;
    const fx = data.usdkrw ?? 0;

    if (uso >= 2) {
      return "원유 급등 부담이 커서 보수적으로 접근. 삼성보다 후순위 유지.";
    }
    if (fx >= 1360) {
      return "환율은 일부 우호적이지만 시장 변동성 먼저 확인 후 천천히 접근.";
    }
    return "시장 안정 시 좋은 자리만 천천히 접근.";
  }, [data]);

  const marketSignal = useMemo(() => {
    if (thermometer.label === "위험") return "오늘은 방어 우선, 추격보다 관망과 분할.";
    if (thermometer.label === "경계") return "무리한 매수보다 눌림·반등 확인이 중요.";
    return "전체 분위기는 무난하지만 분할 접근 원칙 유지.";
  }, [thermometer.label]);

  function card(title: string, value: string, sub: string, color?: string) {
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
        <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
        <div style={{ marginTop: 6, color: color || "#d4d4d8", fontWeight: 700 }}>{sub}</div>
      </div>
    );
  }

  function newsBlock(title: string, items: NewsItem[]) {
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
          <div style={{ color: "#a1a1aa", fontSize: 14 }}>관련 뉴스가 아직 없거나 필터에 안 걸렸어.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item, idx) => (
              <a
                key={`${item.url}-${idx}`}
                href={item.url}
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
                <div style={{ fontWeight: 800, lineHeight: 1.5, marginBottom: 8 }}>
                  {translateHeadlineToKorean(item.headline)}
                </div>
                <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.5, marginBottom: 10 }}>
                  {item.headline}
                </div>
                <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 8 }}>
                  {item.source} · {formatDateTime(item.datetime)}
                </div>
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
        padding: 16,
        fontFamily: "Arial, sans-serif",
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
            마지막 갱신: {data ? new Date(data.updatedAt).toLocaleString("ko-KR") : "-"}{" "}
            {loading ? "· 불러오는 중..." : ""}
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
            오류: {error}
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
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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
            <div style={{ fontSize: 14, color: "#fcd34d", marginBottom: 8 }}>🚦 오늘 시장 위험도</div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {thermometer.emoji} {thermometer.label}
            </div>
            <div style={{ color: "#d4d4d8", marginTop: 10, lineHeight: 1.7 }}>{marketSignal}</div>
          </div>

          <div
            style={{
              background: "#171717",
              border: "1px solid #2a2a2a",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 14, color: "#60a5fa", marginBottom: 8 }}>📌 오늘 삼성 전략</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>삼성전자</div>
            <div style={{ color: "#e4e4e7", lineHeight: 1.8 }}>{samsungGuide}</div>
          </div>

          <div
            style={{
              background: "#171717",
              border: "1px solid #2a2a2a",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 14, color: "#34d399", marginBottom: 8 }}>🚗 오늘 현대차 전략</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>현대차</div>
            <div style={{ color: "#e4e4e7", lineHeight: 1.8 }}>{hyundaiGuide}</div>
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
          <div style={{ fontSize: 14, color: "#fcd34d", marginBottom: 8 }}>
            📊 한국 증시 체온계
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            현재 시장 온도: {thermometer.emoji} {thermometer.label}
          </div>
          <div style={{ color: "#d4d4d8", marginTop: 12, lineHeight: 1.8 }}>
            상승 가능성 {thermometer.rise}% · 보합 가능성 {thermometer.flat}% · 하락 가능성{" "}
            {thermometer.fall}%
          </div>
          <div style={{ color: "#a1a1aa", marginTop: 10, fontSize: 13 }}>
            기준: 나스닥100 대용, 반도체 대용, 원유 대용, 공포 대용, 환율, 지정학 뉴스
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
          {data &&
            card(
              "나스닥100 대용",
              formatPrice(data.quotes.qqq.price),
              formatPct(data.quotes.qqq.changePct),
              colorPct(data.quotes.qqq.changePct)
            )}
          {data &&
            card(
              "S&P500 대용",
              formatPrice(data.quotes.spy.price),
              formatPct(data.quotes.spy.changePct),
              colorPct(data.quotes.spy.changePct)
            )}
          {data &&
            card(
              "반도체 체온계",
              formatPrice(data.quotes.soxx.price),
              formatPct(data.quotes.soxx.changePct),
              colorPct(data.quotes.soxx.changePct)
            )}
          {data &&
            card(
              "원유 체온계",
              formatPrice(data.quotes.uso.price),
              formatPct(data.quotes.uso.changePct),
              colorPct(data.quotes.uso.changePct)
            )}
          {data &&
            card(
              "공포 체온계",
              formatPrice(data.quotes.vixy.price),
              formatPct(data.quotes.vixy.changePct),
              colorPct(data.quotes.vixy.changePct)
            )}
          {card(
            "USD/KRW 환율",
            data?.usdkrw
              ? data.usdkrw.toLocaleString("ko-KR", { maximumFractionDigits: 2 })
              : "-",
            "일일 기준 참고값"
          )}
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
                나스닥100 대용: {data ? formatPct(data.quotes.qqq.changePct) : "-"} / 반도체 체온계:{" "}
                {data ? formatPct(data.quotes.soxx.changePct) : "-"}
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
                환율:{" "}
                {data?.usdkrw
                  ? data.usdkrw.toLocaleString("ko-KR", { maximumFractionDigits: 2 })
                  : "-"}{" "}
                / 원유 체온계: {data ? formatPct(data.quotes.uso.changePct) : "-"}
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
          {newsBlock("지정학 리스크 뉴스", geopoliticalNews)}
          {newsBlock("경제 뉴스", economyNews)}
          {newsBlock("반도체/AI 뉴스", semiNews)}
        </div>
      </div>
    </div>
  );
}