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
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const selectedPoint = useMemo(() => curve?.points.find((point) => point.term === term) || curve?.points[0], [curve, term]);
  const numericAmount = Number(amount.replace(/,/g, ""));
  const hasValidAmount = Number.isFinite(numericAmount) && numericAmount >= 100;

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

  function requestOrderConfirmation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasValidAmount) {
      setMessage("Enter an amount of at least $100.");
      return;
    }
    setMessage("");
    setShowConfirmation(true);
  }

  async function submitOrder() {
    setSubmitting(true);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ term, amount: numericAmount, yield: selectedPoint?.yield }),
    });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "Unable to submit order.");
    else {
      setMessage("Order submitted successfully.");
      setOrders((current) => [data, ...current]);
    }
    setSubmitting(false);
    setShowConfirmation(false);
  }

  return (
    <main className="min-h-screen bg-ink">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-lg font-black text-ink">T</div>
            <div><p className="font-mono text-sm font-semibold tracking-[0.22em] text-forest">T-BILL DESK</p><p className="mt-1 text-xs text-slate-500">A lightweight Treasury order workspace</p></div>
          </div>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Market Snapshot</h1></div><div className="text-right text-xs text-slate-500">{curve ? <>As of <span className="font-mono text-slate-300">{curve.asOf}</span><br />{curve.source === "sample" ? "Market data" : "U.S. Treasury feed"}</> : "Loading market data…"}</div></div>
            <div className="rounded-2xl border border-line bg-panel p-4 shadow-2xl shadow-black/10 sm:p-6">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-medium text-slate-200">Par yield curve</p><p className="mt-1 text-xs text-slate-500">Annualized yield by maturity</p></div><div className="rounded-lg bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">LIVE FEED</div></div>
              {loading ? <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">Loading Treasury data…</div> : curve ? <YieldChart points={curve.points} /> : <div className="flex h-[300px] items-center justify-center text-sm text-red-300">Unable to load yield data.</div>}
              {curve && "warning" in curve && <p className="mt-3 text-xs text-amber">{(curve as YieldCurve & { warning: string }).warning}</p>}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Front end" value={curve?.points[0]?.yield} detail={curve?.points[0]?.term} /><Metric label="2-year" value={curve?.points.find((p) => p.term === "2Y")?.yield} detail="2Y" /><Metric label="Long end" value={curve?.points.at(-1)?.yield} detail={curve?.points.at(-1)?.term} /></div>
          </div>

          <aside className="rounded-2xl border border-line bg-panel p-5 sm:p-6"><div className="mb-6"><p className="font-mono text-xs uppercase tracking-[0.2em] text-forest">New order</p><h2 className="mt-2 text-xl font-semibold text-white">Build a position</h2></div>
            <form onSubmit={requestOrderConfirmation} className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Maturity term</span><select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full rounded-xl border border-line bg-ink px-3 py-3 text-sm text-white outline-none transition focus:border-forest">{curve?.points.map((point) => <option key={point.term} value={point.term}>{point.term} Treasury · {point.yield.toFixed(2)}%</option>)}</select></label><label className="block" htmlFor="order-amount"><span className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">Order amount</span><div className="relative"><span className="absolute left-3 top-3 text-slate-500">$</span><input id="order-amount" aria-label="Order amount" value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value))} inputMode="numeric" required aria-invalid={amount.length > 0 && !hasValidAmount} aria-describedby="order-amount-help" className="w-full rounded-xl border border-line bg-ink py-3 pl-8 pr-3 text-sm text-white outline-none transition focus:border-forest" placeholder="10,000" />{amount.length > 0 && !hasValidAmount && <p id="order-amount-help" className="mt-2 text-xs text-red-300">Minimum order amount is $100.</p>}</div></label><div className="rounded-xl border border-line bg-ink/70 p-4"><div className="flex justify-between text-xs text-slate-500"><span>Indicative yield</span><span className="font-mono text-forest">{selectedPoint ? `${selectedPoint.yield.toFixed(2)}%` : "—"}</span></div><div className="mt-3 flex justify-between text-xs text-slate-500"><span>Estimated annual interest</span><span className="font-mono text-slate-200">{selectedPoint && amount ? currencyWithCents.format(numericAmount * selectedPoint.yield / 100) : "—"}</span></div></div><button disabled={submitting || !curve || !hasValidAmount} className="w-full rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-ink transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Submitting…" : "Submit order"}</button>{message && <p className={`text-center text-xs ${message.includes("Unable") || message.includes("valid") || message.includes("Minimum") ? "text-red-300" : "text-forest"}`}>{message}</p>}</form>
          </aside>
        </section>

        <section className="border-t border-line pt-8"><div className="mb-5 flex items-end justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Activity</p><h2 className="mt-2 text-2xl font-semibold text-white">Order history</h2></div><p className="text-xs text-slate-500">{orders.length} {orders.length === 1 ? "submission" : "submissions"}</p></div><div className="overflow-hidden rounded-2xl border border-line bg-panel">{orders.length === 0 ? <div className="px-5 py-10 text-center text-sm text-slate-500">Your submitted orders will appear here.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4 font-medium">Submitted</th><th className="px-5 py-4 font-medium">Term</th><th className="px-5 py-4 font-medium">Amount</th><th className="px-5 py-4 text-right font-medium">Yield</th></tr></thead><tbody className="divide-y divide-line">{orders.map((order) => <tr key={order.id} className="text-slate-300"><td className="px-5 py-4 text-xs text-slate-500">{dateTime.format(new Date(order.createdAt))}</td><td className="px-5 py-4 font-medium text-white">{order.term} Treasury</td><td className="px-5 py-4 font-mono">{currency.format(order.amount)}</td><td className="px-5 py-4 text-right font-mono text-forest">{order.yield.toFixed(2)}%</td></tr>)}</tbody></table></div>}</div></section>
        {showConfirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="order-confirmation-title" className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl shadow-black/50"><div className="mb-6"><p className="font-mono text-xs uppercase tracking-[0.2em] text-forest">Order preview</p><h2 id="order-confirmation-title" className="mt-2 text-2xl font-semibold text-white">Confirm order</h2><p className="mt-2 text-sm text-slate-400">Review the details before submitting.</p></div><div className="space-y-4 rounded-xl border border-line bg-ink p-4"><div className="flex justify-between text-sm"><span className="text-slate-500">Maturity term</span><span className="font-medium text-white">{term} Treasury</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Order amount</span><span className="font-mono text-white">{currency.format(numericAmount)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-500">Indicative yield</span><span className="font-mono text-forest">{selectedPoint ? `${selectedPoint.yield.toFixed(2)}%` : "—"}</span></div><div className="flex justify-between border-t border-line pt-4 text-sm"><span className="text-slate-500">Estimated annual interest</span><span className="font-mono text-white">{selectedPoint ? currencyWithCents.format(numericAmount * selectedPoint.yield / 100) : "—"}</span></div></div><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowConfirmation(false)} disabled={submitting} className="flex-1 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">Cancel</button><button type="button" onClick={submitOrder} disabled={submitting} className="flex-1 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-ink transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Submitting…" : "Confirm"}</button></div></div></div>}
        <footer className="flex flex-col justify-between gap-2 py-8 text-xs text-slate-600 sm:flex-row"><span>Rates sourced from the U.S. Department of the Treasury.</span></footer>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value?: number; detail?: string }) {
  return <div className="rounded-xl border border-line bg-panel px-4 py-4"><p className="text-xs text-slate-500">{label} <span className="text-slate-700">·</span> {detail || "—"}</p><p className="mt-2 font-mono text-xl text-white">{value === undefined ? "—" : `${value.toFixed(2)}%`}</p></div>;
}
