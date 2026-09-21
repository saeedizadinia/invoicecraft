import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Wallet,
  Clock,
  TrendingUp,
  AlertTriangle,
  Plus,
  Sparkles,
  Loader2,
  ArrowRight,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { useDashboard } from "@/hooks/useDashboard";
import { useReports } from "@/hooks/useFeatures";
import { aiApi } from "@/api/ai";
import { formatMoney, formatDate } from "@/lib/utils";

// Logo palette
const T1 = "#2dd4bf"; // teal-400
const T2 = "#14b8a6"; // teal-500
const T3 = "#0f766e"; // teal-700

const STATUS_COLORS = { draft: "#94a3b8", sent: "#5eead4", overdue: "var(--danger)", paid: T2 };

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  fontSize: 12,
  color: "var(--ink)",
  boxShadow: "var(--shadow-hover)",
};

export default function Dashboard() {
  const nav = useNavigate();
  const { data, isLoading, error } = useDashboard();
  const { data: reports } = useReports();

  if (isLoading) return <DashboardSkeleton />;
  if (error) {
    return <EmptyState icon={Wallet} title="Couldn't load your dashboard" description={error.message} />;
  }

  const { stats, revenueSeries, recentInvoices } = data || {};

  if (!stats?.invoiceCount) {
    return (
      <EmptyState
        icon={Plus}
        title="Welcome — let's get you paid"
        description="Create your first invoice to start tracking revenue, outstanding balances, and overdue payments."
        action={
          <Button variant="accent" size="lg" onClick={() => nav("/invoices/new")}>
            <Plus size={16} /> Create your first invoice
          </Button>
        }
      />
    );
  }

  const collectionRate = stats.totalRevenue + stats.outstanding > 0
    ? Math.round((stats.totalRevenue / (stats.totalRevenue + stats.outstanding)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            {stats.invoiceCount} invoices · {stats.clientCount} clients
          </p>
        </div>
        <Button variant="accent" onClick={() => nav("/invoices/new")}>
          <Plus size={16} /> Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Revenue" value={formatMoney(stats.totalRevenue)} icon={Wallet} accent />
        <StatCard label="Outstanding" value={formatMoney(stats.outstanding)} icon={Clock} />
        <StatCard label="Paid this month" value={formatMoney(stats.paidThisMonth)} icon={TrendingUp} />
        <StatCard label="Overdue" value={stats.overdueCount} suffix={stats.overdueTotal ? formatMoney(stats.overdueTotal) : null} icon={AlertTriangle} />
      </div>

      <AISummaryCard stats={stats} />

      {/* Revenue + Collections gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <RevenueChart series={revenueSeries} />
        </div>
        <div className="lg:col-span-4">
          <CollectionsCard rate={collectionRate} collected={stats.totalRevenue} outstanding={stats.outstanding} />
        </div>
      </div>

      {/* Status donut + Aging + Top clients */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4"><StatusDonutCard reports={reports} total={stats.invoiceCount} /></div>
        <div className="lg:col-span-4"><AgingCard reports={reports} /></div>
        <div className="lg:col-span-4"><TopClientsCard reports={reports} /></div>
      </div>

      <RecentInvoices invoices={recentInvoices} onOpen={(id) => nav(`/invoices/${id}`)} />
    </div>
  );
}

/* ─────────────────── AI summary ─────────────────── */
function AISummaryCard({ stats }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setLoading(true);
    setErr("");
    try {
      const res = await aiApi.businessSummary();
      setSummary(res.summary);
    } catch (e) {
      setErr(e.message || "Couldn't generate summary");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="relative flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[0_8px_20px_-6px_rgba(13,148,136,0.6)]" style={{ background: `linear-gradient(135deg,${T1},${T3})` }}>
          <Sparkles size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-sm font-semibold tracking-tight">AI Business Summary</div>
              <div className="text-xs text-[var(--ink-muted)]">A plain-English read on this month's numbers</div>
            </div>
            <Button variant="soft" size="sm" onClick={generate} disabled={loading}>
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {summary ? "Regenerate" : "Generate"}
            </Button>
          </div>
          {err && <p className="text-sm text-[var(--danger)] mt-3">{err}</p>}
          {summary ? (
            <p className="text-[15px] leading-relaxed text-[var(--ink)] mt-3">{summary}</p>
          ) : (
            !err && (
              <p className="text-sm text-[var(--ink-muted)] mt-3">
                {stats.overdueCount ? `You have ${stats.overdueCount} overdue invoice${stats.overdueCount > 1 ? "s" : ""} totaling ${formatMoney(stats.overdueTotal)}. ` : ""}
                Click generate for an AI-written summary and a follow-up suggestion.
              </p>
            )
          )}
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────── Revenue area chart ─────────────────── */
function RevenueChart({ series }) {
  const dataArr = series || [];
  const hasRevenue = dataArr.some((d) => d.revenue > 0);
  return (
    <Card padding="lg" className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Paid invoices over the last 6 months</CardDescription>
        </div>
      </CardHeader>
      {hasRevenue ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={dataArr} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T1} stopOpacity={0.35} />
                <stop offset="100%" stopColor={T2} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={T1} />
                <stop offset="100%" stopColor={T3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatMoney(v), "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="url(#revStroke)" strokeWidth={3} fill="url(#revArea)" dot={{ r: 3, fill: T2, strokeWidth: 0 }} activeDot={{ r: 5, fill: T2 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[280px] flex flex-col items-center justify-center text-center">
          <div className="font-display text-sm font-semibold mb-1">No paid invoices yet</div>
          <div className="text-xs text-[var(--ink-muted)]">Mark invoices as paid to see revenue here</div>
        </div>
      )}
    </Card>
  );
}

/* ─────────────────── Collections half-donut gauge ─────────────────── */
// Custom SVG semicircle gauge — full control over radius/thickness so the
// number always sits cleanly in the hollow (unlike Recharts' capped radius).
function HalfGauge({ value }) {
  const r = 42;
  const cx = 50;
  const cy = 50;
  const len = Math.PI * r; // length of a semicircle
  const p = Math.max(0, Math.min(100, Number(value) || 0)) / 100;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <svg viewBox="0 0 100 56" className="w-full block">
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={T1} />
          <stop offset="100%" stopColor={T3} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="var(--surface-2)" strokeWidth="9" strokeLinecap="round" />
      <path
        d={d}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - p)}
      />
    </svg>
  );
}

function CollectionsCard({ rate, collected, outstanding }) {
  return (
    <Card padding="lg" className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Collections</CardTitle>
          <CardDescription>Share of billed revenue collected</CardDescription>
        </div>
      </CardHeader>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-[340px] px-2">
          <HalfGauge value={rate} />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pointer-events-none">
            <span className="font-display text-[46px] font-semibold tabular text-[var(--ink)] leading-none">{rate}%</span>
            <span className="text-sm text-[var(--ink-muted)] mt-1.5">collected</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <GaugeStat dot={T2} label="Collected" value={formatMoney(collected)} />
        <GaugeStat dot="var(--warning)" label="Outstanding" value={formatMoney(outstanding)} />
      </div>
    </Card>
  );
}
function GaugeStat({ dot, label, value }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-2)] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} /> {label}
      </div>
      <div className="text-sm font-semibold text-[var(--ink)] tabular mt-1 truncate">{value}</div>
    </div>
  );
}

/* ─────────────────── Status donut ─────────────────── */
function StatusDonutCard({ reports, total }) {
  const data = (reports?.statusBreakdown || []).filter((s) => s.value > 0);
  return (
    <Card padding="lg" className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Invoice status</CardTitle>
          <CardDescription>By amount</CardDescription>
        </div>
      </CardHeader>
      {!reports ? (
        <ChartSkeleton />
      ) : data.length ? (
        <div className="flex-1 flex items-center gap-5">
          <div className="relative h-[172px] w-[172px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="gPaid" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={T1} /><stop offset="100%" stopColor={T3} /></linearGradient>
                  <linearGradient id="gSent" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#99f6e4" /><stop offset="100%" stopColor="#2dd4bf" /></linearGradient>
                  <linearGradient id="gOverdue" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#e11d48" /></linearGradient>
                  <linearGradient id="gDraft" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#cbd5e1" /><stop offset="100%" stopColor="#94a3b8" /></linearGradient>
                </defs>
                <Pie data={data} dataKey="value" innerRadius={54} outerRadius={80} paddingAngle={2} stroke="none">
                  {data.map((s) => <Cell key={s.key} fill={`url(#g${s.name})`} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [formatMoney(v), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-display text-2xl font-semibold text-[var(--ink)]">{total}</span>
              <span className="text-[10px] text-[var(--ink-muted)]">invoices</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            {data.map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.key] }} />
                <span className="text-[var(--ink-muted)] flex-1">{s.name}</span>
                <span className="tabular font-semibold text-[var(--ink)]">{formatMoney(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--ink-muted)]">No invoices yet</div>
      )}
    </Card>
  );
}

/* ─────────────────── AR aging ─────────────────── */
function AgingCard({ reports }) {
  const aging = reports?.aging || [];
  const hasData = aging.some((a) => a.value > 0);
  return (
    <Card padding="lg" className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Receivables aging</CardTitle>
          <CardDescription>Unpaid by days overdue</CardDescription>
        </div>
      </CardHeader>
      {!reports ? (
        <ChartSkeleton />
      ) : hasData ? (
        <div className="flex-1 min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aging} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
              <defs>
                <linearGradient id="gCurrent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T1} /><stop offset="100%" stopColor={T3} /></linearGradient>
                <linearGradient id="gWarn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fcd34d" /><stop offset="100%" stopColor="#d97706" /></linearGradient>
                <linearGradient id="gDanger" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#e11d48" /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={tooltipStyle} formatter={(v) => [formatMoney(v), "Amount"]} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {aging.map((_, i) => <Cell key={i} fill={i === 0 ? "url(#gCurrent)" : i >= 3 ? "url(#gDanger)" : "url(#gWarn)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center text-sm text-[var(--ink-muted)]">All caught up 🎉</div>
      )}
    </Card>
  );
}

/* ─────────────────── Top clients ─────────────────── */
function TopClientsCard({ reports }) {
  const clients = reports?.topClients || [];
  const max = Math.max(1, ...clients.map((c) => c.billed));
  return (
    <Card padding="lg" className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Top clients</CardTitle>
          <CardDescription>By total billed</CardDescription>
        </div>
      </CardHeader>
      {!reports ? (
        <ChartSkeleton />
      ) : clients.length ? (
        <div className="space-y-3.5 pt-1">
          {clients.map((c) => (
            <div key={c.id}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-[var(--ink)] truncate">{c.name}</span>
                <span className="tabular font-semibold text-[var(--ink)] shrink-0 ml-3">{formatMoney(c.billed)}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(5, (c.billed / max) * 100)}%`, background: `linear-gradient(90deg,${T1},${T3})` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[150px] flex items-center justify-center text-sm text-[var(--ink-muted)]">
          <Users size={16} className="mr-2" /> No client billing yet
        </div>
      )}
    </Card>
  );
}

/* ─────────────────── Recent invoices ─────────────────── */
function RecentInvoices({ invoices, onOpen }) {
  const rows = invoices || [];
  return (
    <Card padding="lg">
      <CardHeader>
        <div>
          <CardTitle>Recent invoices</CardTitle>
          <CardDescription>Your latest 5 invoices</CardDescription>
        </div>
      </CardHeader>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--ink-muted)]">No invoices yet</div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {rows.map((inv) => (
            <button key={inv.id} onClick={() => onOpen(inv.id)} className="group flex items-center gap-3 py-3 text-left hover:opacity-90 transition-opacity">
              <div className="h-9 w-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center font-semibold text-sm shrink-0">
                {inv.client_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--ink)] truncate">{inv.client_name || "No client"}</div>
                <div className="text-xs text-[var(--ink-muted)] tabular">{inv.invoice_number} · {formatDate(inv.issue_date)}</div>
              </div>
              <div className="text-sm font-semibold text-[var(--ink)] tabular shrink-0">{formatMoney(inv.total, inv.currency)}</div>
              <StatusBadge status={inv.effective_status} />
              <ArrowRight size={14} className="text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[150px] rounded-2xl" />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)}
      </div>
      <Skeleton className="h-[92px] rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Skeleton className="lg:col-span-8 h-[360px] rounded-3xl" />
        <Skeleton className="lg:col-span-4 h-[360px] rounded-3xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Skeleton className="lg:col-span-4 h-[240px] rounded-3xl" />
        <Skeleton className="lg:col-span-4 h-[240px] rounded-3xl" />
        <Skeleton className="lg:col-span-4 h-[240px] rounded-3xl" />
      </div>
    </div>
  );
}
