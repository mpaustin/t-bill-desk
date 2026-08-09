import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

const createClientMock = vi.mocked(createClient);

function authenticatedRequest(method: "GET" | "POST", body?: unknown) {
  return new NextRequest("http://localhost/api/orders", {
    method,
    headers: {
      authorization: "Bearer access-token",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function useSupabaseEnvironment() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
}

describe("/api/orders with Supabase authentication", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("inserts a valid order for the authenticated user", async () => {
    useSupabaseEnvironment();
    const authClient = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } } }) } };
    const insertedOrder = { id: "order-123", term: "6M", amount: "12500.00", yield: "4.22", created_at: "2026-08-09T12:00:00.000Z" };
    const single = vi.fn().mockResolvedValue({ data: insertedOrder, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const adminClient = { from: vi.fn().mockReturnValue({ insert }) };
    createClientMock.mockReturnValueOnce(authClient as never).mockReturnValueOnce(adminClient as never);

    const { POST } = await import("@/app/api/orders/route");
    const response = await POST(authenticatedRequest("POST", { term: "6M", amount: 12500, yield: 4.22 }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "order-123",
      term: "6M",
      amount: 12500,
      yield: 4.22,
      createdAt: "2026-08-09T12:00:00.000Z",
    });
    expect(authClient.auth.getUser).toHaveBeenCalledWith("access-token");
    expect(insert).toHaveBeenCalledWith({ user_id: "user-123", term: "6M", amount: 12500, yield: 4.22 });
  });

  it("returns only the authenticated user's order history", async () => {
    useSupabaseEnvironment();
    const authClient = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } } }) } };
    const rows = [{ id: "order-123", term: "1Y", amount: "5000", yield: "4.04", created_at: "2026-08-09T12:00:00.000Z" }];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const adminClient = { from };
    createClientMock.mockReturnValueOnce(authClient as never).mockReturnValueOnce(adminClient as never);

    const { GET } = await import("@/app/api/orders/route");
    const response = await GET(authenticatedRequest("GET"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: "order-123", term: "1Y", amount: 5000, yield: 4.04, createdAt: "2026-08-09T12:00:00.000Z" },
    ]);
    expect(from).toHaveBeenCalledWith("orders");
    expect(eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });
});
