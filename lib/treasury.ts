export type YieldPoint = {
  term: string;
  years: number;
  yield: number;
};

export type YieldCurve = {
  asOf: string;
  points: YieldPoint[];
  source: "treasury" | "sample";
};

const fields = [
  ["1M", "BC_1MONTH", 1 / 12],
  ["2M", "BC_2MONTH", 2 / 12],
  ["3M", "BC_3MONTH", 3 / 12],
  ["4M", "BC_4MONTH", 4 / 12],
  ["6M", "BC_6MONTH", 6 / 12],
  ["1Y", "BC_1YEAR", 1],
  ["2Y", "BC_2YEAR", 2],
  ["3Y", "BC_3YEAR", 3],
  ["5Y", "BC_5YEAR", 5],
  ["7Y", "BC_7YEAR", 7],
  ["10Y", "BC_10YEAR", 10],
  ["20Y", "BC_20YEAR", 20],
  ["30Y", "BC_30YEAR", 30],
] as const;

export const sampleCurve: YieldCurve = {
  asOf: "2026-08-07",
  source: "sample",
  points: [
    { term: "1M", years: 1 / 12, yield: 4.38 },
    { term: "2M", years: 2 / 12, yield: 4.36 },
    { term: "3M", years: 3 / 12, yield: 4.34 },
    { term: "4M", years: 4 / 12, yield: 4.31 },
    { term: "6M", years: 6 / 12, yield: 4.22 },
    { term: "1Y", years: 1, yield: 4.04 },
    { term: "2Y", years: 2, yield: 3.91 },
    { term: "3Y", years: 3, yield: 3.89 },
    { term: "5Y", years: 5, yield: 3.96 },
    { term: "7Y", years: 7, yield: 4.09 },
    { term: "10Y", years: 10, yield: 4.23 },
    { term: "20Y", years: 20, yield: 4.54 },
    { term: "30Y", years: 30, yield: 4.69 },
  ],
};

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]*)<`, "i"));
  return match?.[1]?.trim() || "";
}

function parseDate(value: string) {
  const iso = value.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const compact = value.match(/(20\d{2})(\d{2})(\d{2})/);
  return compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : new Date().toISOString().slice(0, 10);
}

export function parseTreasuryXml(xml: string): YieldCurve {
  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const row = entries.at(-1) || xml;
  const points = fields
    .map(([term, field, years]) => ({ term, years, yield: Number.parseFloat(tagValue(row, field)) }))
    .filter((point) => Number.isFinite(point.yield));

  if (!points.length) throw new Error("Treasury returned no usable yield curve data.");
  return { asOf: parseDate(tagValue(row, "NEW_DATE")), points, source: "treasury" };
}

export async function fetchTreasuryCurve(): Promise<YieldCurve> {
  const year = new Date().getUTCFullYear();
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;
  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`Treasury request failed with ${response.status}.`);
  return parseTreasuryXml(await response.text());
}
