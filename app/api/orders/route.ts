import { NextRequest, NextResponse } from "next/server";
import { getDemoOrders, type Order } from "@/lib/orders";
import { createClient } from "@supabase/supabase-js";

const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getSupabaseUser(request: NextRequest) {
  if (!hasSupabase) return null;
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await client.auth.getUser(token);
  return data.user;
}

export async function GET(request: NextRequest) {
  const user = await getSupabaseUser(request);
  if (hasSupabase && user) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await admin.from("orders").select("id, term, amount, yield, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data || []).map((order) => ({ id: order.id, term: order.term, amount: Number(order.amount), yield: Number(order.yield), createdAt: order.created_at })));
  }
  return NextResponse.json(getDemoOrders());
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const term = typeof body?.term === "string" ? body.term : "";
  const amount = Number(body?.amount);
  const yieldValue = Number(body?.yield);
  if (!term || !Number.isFinite(amount) || amount < 100 || !Number.isFinite(yieldValue)) {
    return NextResponse.json({ error: "Enter a valid term and an amount of at least $100." }, { status: 400 });
  }

  const user = await getSupabaseUser(request);
  if (hasSupabase && user) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await admin.from("orders").insert({ user_id: user.id, term, amount, yield: yieldValue }).select("id, term, amount, yield, created_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id, term: data.term, amount: Number(data.amount), yield: Number(data.yield), createdAt: data.created_at }, { status: 201 });
  }

  const order: Order = { id: crypto.randomUUID(), term, amount, yield: yieldValue, createdAt: new Date().toISOString() };
  getDemoOrders().unshift(order);
  return NextResponse.json(order, { status: 201 });
}
