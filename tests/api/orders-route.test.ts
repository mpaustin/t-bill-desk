import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrders } from "@/lib/orders";

function requestWithBody(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function loadLocalOrdersRoute() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  return import("@/app/api/orders/route");
}

describe("/api/orders validation and local behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    getOrders().length = 0;
  });

  it("rejects an order below the $100 minimum", async () => {
    const { POST } = await loadLocalOrdersRoute();

    const response = await POST(requestWithBody({ term: "3M", amount: 99, yield: 4.34 }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Enter a valid term and an amount of at least $100." });
  });

  it("creates a valid order and returns it in order history", async () => {
    const { GET, POST } = await loadLocalOrdersRoute();

    const response = await POST(requestWithBody({ term: "6M", amount: 12500, yield: 4.22 }));
    const created = await response.json();
    const historyResponse = await GET(new NextRequest("http://localhost/api/orders"));

    expect(response.status).toBe(201);
    expect(created).toMatchObject({ term: "6M", amount: 12500, yield: 4.22 });
    expect(created.id).toEqual(expect.any(String));
    expect(created.createdAt).toEqual(expect.any(String));
    expect(await historyResponse.json()).toEqual([created]);
  });
});
