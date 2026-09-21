import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Wallet,
  Receipt,
  TrendingUp,
  Clock,
  Download,
  BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useReports } from "@/hooks/useFeatures";
import { formatMoney } from "@/lib/utils";

const STATUS_COLORS = {
  draft: "var(--ink-muted)",
  sent: "var(--accent)",
  overdue: "var(--danger)",
  paid: "var(--success)",
};

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--ink)",
};

export default function Reports() {
  const { data, isLoading } = useReports();

  if (isLoading) return <ReportsSkeleton />;
  if (!data) return <EmptyState icon={BarChart3} title="No report data" description="Add invoices to see analytics." />;

  const { totals, monthly, aging, topClients, statusBreakdown } = data;
  const statusData = statusBreakdown.filter((s) => s.value > 0);
  const agingHasData = aging.some((a) => a.value > 0);
  const maxClient = Math.max(1, ...topClients.map((c) => c.billed));

  function exportCSV() {
    const rows = [
      ["Metric", "Value"],
      ["Total revenue", totals.revenue],
      ["Total expenses", totals.expenses],
      ["Net profit", totals.netProfit],
      ["Outstanding", totals.outstanding],
      [],
      ["Month", "Revenue", "Expenses"],
      ...monthly.map((m) => [m.label, m.revenue, m.expenses]),
      [],
      ["Aging bucket", "Amount"],
      ...aging.map((a) => [a.bucket, a.value]),
      [],
      ["Top client", "Billed", "Paid"],
      ...topClients.map((c) => [c.name, c.billed, c.paid]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoicer-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Revenue, profit, aging, and your top clients at a glance."
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Revenue" value={formatMoney(totals.revenue)} icon={Wallet} accent />
        <StatCard label="Total Expenses" value={formatMoney(totals.expenses)} icon={Receipt} />
        <StatCard label="Net Profit" value={formatMoney(totals.netProfit)} icon={TrendingUp} />
        <StatCard label="Outstanding" value={formatMoney(totals.outstanding)} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue vs Expenses */}
        <div className="lg:col-span-2">
          <Card padding="lg" className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Revenue vs Expenses</CardTitle>
                <CardDescription>Paid revenue and expenses, last 6 months</CardDescription>
              </div>
            </CardHeader>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={tooltipStyle} formatter={(v, n) => [formatMoney(v), n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar name="Revenue" dataKey="revenue" fill="var(--accent)" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Bar name="Expenses" dataKey="expenses" fill="var(--warning)" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Status breakdown donut */}
        <Card padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Invoice status</CardTitle>
              <CardDescription>By amount</CardDescription>
            </div>
          </CardHeader>
          {statusData.length ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
                    {statusData.map((s) => <Cell key={s.key} fill={STATUS_COLORS[s.key]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [formatMoney(v), n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {statusData.map((s) => (
                  <div key={s.key} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.key] }} />
                    <span className="text-[var(--ink-muted)] flex-1">{s.name}</span>
                    <span className="tabular font-medium text-[var(--ink)]">{formatMoney(s.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-[var(--ink-muted)]">No invoices yet</div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Aging */}
        <Card padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Accounts receivable aging</CardTitle>
              <CardDescription>Unpaid invoices by how overdue they are</CardDescription>
            </div>
          </CardHeader>
          {agingHasData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={aging} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={tooltipStyle} formatter={(v) => [formatMoney(v), "Amount"]} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={48}>
                  {aging.map((a, i) => (
                    <Cell key={i} fill={i === 0 ? "var(--accent)" : i >= 3 ? "var(--danger)" : "var(--warning)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-[var(--ink-muted)]">Nothing outstanding — you're all caught up! 🎉</div>
          )}
        </Card>

        {/* Top clients */}
        <Card padding="lg">
          <CardHeader>
            <div>
              <CardTitle>Top clients</CardTitle>
              <CardDescription>By total billed</CardDescription>
            </div>
          </CardHeader>
          {topClients.length ? (
            <div className="space-y-4 pt-1">
              {topClients.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-[var(--ink)] truncate">{c.name}</span>
                    <span className="tabular font-semibold text-[var(--ink)] shrink-0 ml-3">{formatMoney(c.billed)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, (c.billed / maxClient) * 100)}%`, background: "linear-gradient(90deg,var(--accent),var(--accent-hero-2))" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-[var(--ink-muted)]">No client billing yet</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-56 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="lg:col-span-2 h-[360px] rounded-3xl" />
        <Skeleton className="h-[360px] rounded-3xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-[320px] rounded-3xl" />
        <Skeleton className="h-[320px] rounded-3xl" />
      </div>
    </div>
  );
}
