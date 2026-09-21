import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Receipt,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientFormModal } from "@/components/clients/ClientFormModal";
import { useClient, useDeleteClient } from "@/hooks/useClients";
import { formatMoney, formatDate } from "@/lib/utils";

function isOverdue(inv) {
  return inv.status === "sent" && inv.due_date && new Date(inv.due_date) < new Date();
}

// Everything below is derived from the invoices already loaded — no extra API call.
function computeInsights(invoices, stats) {
  const num = (v) => Number(v) || 0;
  const paidAmt = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + num(i.total), 0);
  const overdueAmt = invoices.filter(isOverdue).reduce((s, i) => s + num(i.total), 0);
  const openAmt = Math.max(0, num(stats.totalBilled) - paidAmt - overdueAmt);

  const breakdown = [
    { name: "Paid", value: Math.round(paidAmt * 100) / 100, color: "var(--success)" },
    { name: "Open", value: Math.round(openAmt * 100) / 100, color: "var(--accent)" },
    { name: "Overdue", value: Math.round(overdueAmt * 100) / 100, color: "var(--danger)" },
  ].filter((s) => s.value > 0);

  // Last 6 months of billing by issue date.
  const map = {};
  invoices.forEach((inv) => {
    const d = new Date(inv.issue_date);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    map[key] = (map[key] || 0) + num(inv.total);
  });
  const now = new Date();
  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthly.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      value: Math.round((map[key] || 0) * 100) / 100,
    });
  }

  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const count = invoices.length;
  const largest = invoices.reduce((m, i) => Math.max(m, num(i.total)), 0);
  const avgInvoice = count ? num(stats.totalBilled) / count : 0;
  const paidRate = count ? Math.round((paidCount / count) * 100) : 0;

  return { breakdown, monthly, largest, avgInvoice, paidRate, hasMonthly: monthly.some((m) => m.value > 0) };
}

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, isLoading, error } = useClient(id);
  const del = useDeleteClient();
  const [editOpen, setEditOpen] = useState(false);

  const invoices = data?.invoices || [];
  const stats = data?.stats || { count: 0, totalBilled: 0, outstanding: 0 };
  const insights = useMemo(() => computeInsights(invoices, stats), [invoices, stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--ink-muted)]">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }
  if (error || !data?.client) {
    return <EmptyState icon={Mail} title="Client not found" description="It may have been deleted." />;
  }

  const client = data.client;

  async function onDelete() {
    if (!window.confirm(`Delete ${client.name}? Their invoices will be kept but unlinked.`)) return;
    await del.mutateAsync(id);
    nav("/clients");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("/clients")}
            className="h-9 w-9 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] shadow-card"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center font-semibold text-lg">
              {client.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{client.name}</h2>
              {client.company && <p className="text-sm text-[var(--ink-muted)]">{client.company}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="accent"
            onClick={() => nav(`/invoices/new?client=${id}`)}
          >
            <Plus size={15} /> New Invoice
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil size={15} /> Edit
          </Button>
          <Button variant="ghost" onClick={onDelete} className="text-[var(--danger)] hover:bg-[var(--danger)]/10">
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      {/* Stats — full-width row so currency values have room */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <MiniStat label="Invoices" value={stats.count} />
        <MiniStat label="Total billed" value={formatMoney(stats.totalBilled)} />
        <MiniStat label="Outstanding" value={formatMoney(stats.outstanding)} warn={stats.outstanding > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left: contact */}
        <div className="space-y-5">
          <Card padding="lg">
            <CardTitle className="mb-4">Contact</CardTitle>
            <div className="space-y-3">
              <ContactRow icon={Mail} value={client.email} href={client.email ? `mailto:${client.email}` : null} />
              <ContactRow icon={Phone} value={client.phone} />
              <ContactRow icon={Building2} value={client.company} />
              <ContactRow icon={MapPin} value={client.address} />
            </div>
            {client.notes && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold mb-1">
                  Notes
                </div>
                <p className="text-sm text-[var(--ink)]">{client.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right: invoice history */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <CardTitle className="mb-4">Invoice history</CardTitle>
            {invoices.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-[var(--ink-muted)]">No invoices for this client yet.</p>
                <Button variant="soft" size="sm" className="mt-3" onClick={() => nav(`/invoices/new?client=${id}`)}>
                  <Plus size={14} /> Create one
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {invoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => nav(`/invoices/${inv.id}`)}
                    className="w-full flex items-center gap-3 py-3 text-left hover:opacity-90"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--ink)] tabular">
                        {inv.invoice_number}
                      </div>
                      <div className="text-xs text-[var(--ink-muted)]">
                        Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--ink)] tabular shrink-0">
                      {formatMoney(inv.total, inv.currency)}
                    </div>
                    <StatusBadge
                      status={
                        inv.status === "sent" && inv.due_date && new Date(inv.due_date) < new Date()
                          ? "overdue"
                          : inv.status
                      }
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Insights row — aligns with the columns above (1 / 2 split) */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5 items-start">
          <PaymentStatusCard insights={insights} stats={stats} />
          <div className="lg:col-span-2">
            <BillingChartCard insights={insights} />
          </div>
        </div>
      )}

      <ClientFormModal open={editOpen} onClose={() => setEditOpen(false)} client={client} />
    </div>
  );
}

function PaymentStatusCard({ insights, stats }) {
  const { breakdown, avgInvoice, largest, paidRate } = insights;
  const hasData = breakdown.length > 0;
  return (
    <Card padding="lg">
      <CardTitle className="mb-4">Payment status</CardTitle>
      {hasData ? (
        <div className="flex items-center gap-4">
          <div className="relative h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="value"
                  innerRadius={38}
                  outerRadius={56}
                  paddingAngle={2}
                  stroke="none"
                >
                  {breakdown.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--ink)",
                  }}
                  formatter={(v, n) => [formatMoney(v), n]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-display font-semibold tabular text-[var(--ink)]">{paidRate}%</span>
              <span className="text-[10px] text-[var(--ink-muted)]">paid</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            {breakdown.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[var(--ink-muted)] flex-1">{s.name}</span>
                <span className="tabular font-medium text-[var(--ink)]">{formatMoney(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-[var(--ink-muted)]">Nothing billed yet.</div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[var(--border)]">
        <Metric icon={Receipt} label="Avg invoice" value={formatMoney(avgInvoice)} />
        <Metric icon={TrendingUp} label="Largest" value={formatMoney(largest)} />
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">{label}</div>
        <div className="text-sm font-semibold text-[var(--ink)] tabular truncate">{value}</div>
      </div>
    </div>
  );
}

function BillingChartCard({ insights }) {
  const { monthly, hasMonthly } = insights;
  return (
    <Card padding="lg" className="h-full">
      <CardTitle className="mb-4">Billing over time</CardTitle>
      {hasMonthly ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} margin={{ top: 6, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="clientBillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-hero-2)" />
                <stop offset="100%" stopColor="var(--accent)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--ink)",
              }}
              formatter={(v) => [formatMoney(v), "Billed"]}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40} fill="url(#clientBillGrad)" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-sm text-[var(--ink-muted)]">
          No billing activity in the last 6 months.
        </div>
      )}
    </Card>
  );
}

function ContactRow({ icon: Icon, value, href }) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-3 text-sm">
      <div className="h-8 w-8 rounded-xl bg-[var(--surface-2)] text-[var(--ink-muted)] flex items-center justify-center shrink-0">
        <Icon size={14} />
      </div>
      <span className="text-[var(--ink)] truncate">{value}</span>
    </div>
  );
  return href ? (
    <a href={href} className="block hover:text-[var(--accent-strong)]">
      {content}
    </a>
  ) : (
    content
  );
}

function MiniStat({ label, value, warn }) {
  return (
    <Card padding="lg">
      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">{label}</div>
      <div
        className={`font-display text-2xl font-semibold tabular mt-1.5 truncate ${
          warn ? "text-[var(--warning)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </div>
    </Card>
  );
}
