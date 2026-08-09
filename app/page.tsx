"use client";

import { useEffect, useMemo, useState } from "react";
import { YieldChart } from "@/components/yield-chart";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { YieldCurve } from "@/lib/treasury";
import type { Order } from "@/lib/orders";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currencyWithCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function formatAmountInput(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function Home() {
  const [curve, setCurve] = useState<YieldCurve | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [term, setTerm] = useState("3M");
  const [amount, setAmount] = useState("10,000");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const selectedPoint = useMemo(() => curve?.points.find((point) => point.term === term) || curve?.points[0], [curve, term]);

  async function authHeaders(): Promise<Record<string, string>> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return {};
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) return { Authorization: `Bearer ${sessionData.session.access_token}` };
    const { data } = await supabase.auth.signInAnonymously();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }

  async function loadOrders() {
    const response = await fetch("/api/orders", { headers: await authHeaders() });
    if (response.ok) setOrders(await response.json());
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/treasury").then((response) => response.json()).then(setCurve),
      loadOrders(),
    ]).finally(() => setLoading(false));
  }, []);

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ term, amount: Number(amount.replace(/,/g, "")), yield: selectedPoint?.yield }),
    });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "Unable to submit order.");
    else {
      setMessage("Order submitted to the demo desk.");
      setOrders((current) => [data, ...current]);
    }
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-ink">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan text-lg font-black text-ink">T</div>
            <div><p className="font-mono text-sm font-semibold tracking-[0.22em] text-cyan">T-BILL DESK</p><p className="mt-1 text-xs text-slate-500">A lightweight Treasury order workspace</p></div>
          </div>
          <div className="hidden rounded-full border border-line px-3 py-1.5 text-xs text-slate-400 sm:block"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan" />Paper trading mode</div>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-amber">Market snapshot</p><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">The curve, at a glance.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Use the latest Treasury par yields to explore a term and place a simulated order.</p></div><div className="text-right text-xs text-slate-500">{curve ? <>As of <span className="font-mono text-slate-300">{curve.asOf}</span><br />{curve.source === "sample" ? "Demo fallback data" : "U.S. Treasury feed"}</> : "Loading market data…"}</div></div>
            <div className="rounded-2xl border border-line bg-panel p-4 shadow-2xl shadow-black/10 sm:p-6">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-medium text-slate-200">Par yield curve</p><p className="mt-1 text-xs text-slate-500">Annualized yield by maturity</p></div><div className="rounded-lg bg-cyan/10 px-2.5 py-1 text-xs font-medium text-cyan">LIVE FEED</div></div>
              {loading ? <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">Loading Treasury data…</div> : curve ? <YieldChart points={curve.points} /> : <div className="flex h-[300px] items-center justify-center text-sm text-red-300">Unable to load yield data.</div>}
              {curve && "warning" in curve && <p className="mt-3 text-xs text-amber">{(curve as YieldCurve & { warning: string }).warning}</p>}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Front end" value={curve?.points[0]?.yield} detail={curve?.points[0]?.term} /><Metric label="2-year" value={curve?.points.find((p) => p.term === "2Y")?.yield} detail="2Y" /><Metric label="Long end" value={curve?.points.at(-1)?.yield} detail={curve?.points.at(-1)?.term} /></div>
          </div>

          <aside className="rounded-2xl border border-line bg-panel p-5 sm:p-6"><div className="mb-6"><p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">New order</p><h2 className="mt-2 text-xl font-semibold text-white">Build a position</h2><p className="mt-2 text-sm leading-5 text-slate-400">Choose a term and notional amount. This creates a paper order for review.</p></div>
            <form onSubmit={submitOrder} className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Maturity term</span><select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full rounded-xl border border-line bg-ink px-3 py-3 text-sm text-white outline-none transition focus:border-cyan">{curve?.points.map((point) => <option key={point.term} value={point.term}>{point.term} Treasury · {point.yield.toFixed(2)}%</option>)}</select></label><label className="block" htmlFor="order-amount"><span className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Order amount</span><div className="relative"><span className="absolute left-3 top-3 text-slate-500">$</span><input id="order-amount" aria-label="Order amount" value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value))} inputMode="numeric" className="w-full rounded-xl border border-line bg-ink py-3 pl-8 pr-3 text-sm text-white outline-none transition focus:border-cyan" placeholder="10,000" /></div></label><div className="rounded-xl border border-line bg-ink/70 p-4"><div className="flex justify-between text-xs text-slate-500"><span>Indicative yield</span><span className="font-mono text-cyan">{selectedPoint ? `${selectedPoint.yield.toFixed(2)}%` : "—"}</span></div><div className="mt-3 flex justify-between text-xs text-slate-500"><span>Estimated annual interest</span><span className="font-mono text-slate-200">{selectedPoint && amount ? currencyWithCents.format(Number(amount.replace(/,/g, "")) * selectedPoint.yield / 100) : "—"}</span></div></div><button disabled={submitting || !curve} className="w-full rounded-xl bg-cyan px-4 py-3 text-sm font-semibold text-ink transition hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Submitting…" : "Submit paper order"}</button>{message && <p className={`text-center text-xs ${message.includes("Unable") || message.includes("valid") ? "text-red-300" : "text-cyan"}`}>{message}</p>}</form>
          </aside>
        </section>

        <section className="border-t border-line pt-8"><div className="mb-5 flex items-end justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">Activity</p><h2 className="mt-2 text-2xl font-semibold text-white">Order history</h2></div><p className="text-xs text-slate-500">{orders.length} {orders.length === 1 ? "submission" : "submissions"}</p></div><div className="overflow-hidden rounded-2xl border border-line bg-panel">{orders.length === 0 ? <div className="px-5 py-10 text-center text-sm text-slate-500">Your submitted paper orders will appear here.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4 font-medium">Submitted</th><th className="px-5 py-4 font-medium">Term</th><th className="px-5 py-4 font-medium">Amount</th><th className="px-5 py-4 text-right font-medium">Yield</th></tr></thead><tbody className="divide-y divide-line">{orders.map((order) => <tr key={order.id} className="text-slate-300"><td className="px-5 py-4 text-xs text-slate-500">{dateTime.format(new Date(order.createdAt))}</td><td className="px-5 py-4 font-medium text-white">{order.term} Treasury</td><td className="px-5 py-4 font-mono">{currency.format(order.amount)}</td><td className="px-5 py-4 text-right font-mono text-cyan">{order.yield.toFixed(2)}%</td></tr>)}</tbody></table></div>}</div></section>
        <footer className="flex flex-col justify-between gap-2 py-8 text-xs text-slate-600 sm:flex-row"><span>Rates sourced from the U.S. Department of the Treasury.</span><span>Demo only · No orders are sent to a brokerage.</span></footer>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value?: number; detail?: string }) {
  return <div className="rounded-xl border border-line bg-panel px-4 py-4"><p className="text-xs text-slate-500">{label} <span className="text-slate-700">·</span> {detail || "—"}</p><p className="mt-2 font-mono text-xl text-white">{value === undefined ? "—" : `${value.toFixed(2)}%`}</p></div>;
}
