import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTreasuryCurve, sampleCurve, type YieldCurve } from "@/lib/treasury";
import { GET } from "@/app/api/treasury/route";

vi.mock("@/lib/treasury", async () => {
  const actual = await vi.importActual<typeof import("@/lib/treasury")>("@/lib/treasury");
  return { ...actual, fetchTreasuryCurve: vi.fn() };
});

const fetchTreasuryCurveMock = vi.mocked(fetchTreasuryCurve);

describe("GET /api/treasury", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current Treasury curve when the feed succeeds", async () => {
    const curve: YieldCurve = {
      asOf: "2026-08-07",
      source: "treasury",
      points: [{ term: "3M", years: 0.25, yield: 4.34 }],
    };
    fetchTreasuryCurveMock.mockResolvedValue(curve);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(curve);
  });

  it("returns the sample curve with a warning when the feed fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchTreasuryCurveMock.mockRejectedValue(new Error("network failure"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ...sampleCurve,
      warning: expect.stringContaining("fallback"),
    });
  });
});
