import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Wallet, Trash2, X, Loader2, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { usePayments, usePaymentMutations } from "@/hooks/useFeatures";
import { useInvoices } from "@/hooks/useInvoices";
import { formatMoney, formatDate } from "@/lib/utils";

export default function Payments() {
  const { data, isLoading } = usePayments();
  const { remove } = usePaymentMutations();
  const [modalOpen, setModalOpen] = useState(false);

  const payments = data?.payments || [];

  async function onDelete(p) {
    if (!window.confirm(`Remove this ${formatMoney(p.amount)} payment? The invoice may revert to unpaid.`)) return;
    await remove.mutateAsync(p.id);
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="A ledger of every payment received against your invoices."
        actions={
          <Button variant="accent" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Record Payment
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 max-w-2xl">
        <StatCard label="Total received" value={formatMoney(data?.totals?.total || 0)} icon={Wallet} accent />
        <StatCard label="Received this month" value={formatMoney(data?.totals?.thisMonth || 0)} icon={CreditCard} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments recorded"
          description="Record a payment against an invoice to build your ledger."
          action={<Button variant="accent" onClick={() => setModalOpen(true)}><Plus size={16} /> Record Payment</Button>}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_1.4fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
            <span>Date</span><span>Invoice / Client</span><span>Method</span><span className="text-right">Amount</span><span></span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {payments.map((p) => (
              <div key={p.id} className="group grid grid-cols-2 md:grid-cols-[1fr_1.4fr_1fr_1fr_auto] gap-x-4 gap-y-1 px-5 py-4 items-center">
                <div className="text-sm text-[var(--ink-muted)] tabular">{formatDate(p.paid_on)}</div>
                <div className="order-3 md:order-none col-span-2 md:col-span-1 min-w-0">
                  <div className="text-sm font-semibold text-[var(--ink)] tabular truncate">{p.invoice_number}</div>
                  <div className="text-xs text-[var(--ink-muted)] truncate">{p.client_name || "No client"}</div>
                </div>
                <div className="hidden md:block">
                  {p.method ? <Badge tone="neutral">{p.method}</Badge> : <span className="text-xs text-[var(--ink-muted)]">—</span>}
                </div>
                <div className="text-sm font-semibold text-[var(--success)] tabular text-right">{formatMoney(p.amount)}</div>
                <button onClick={() => onDelete(p)} className="justify-self-end h-7 w-7 rounded-full flex items-center justify-center text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--surface-2)] hover:text-[var(--danger)]">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <RecordPaymentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

const METHODS = ["Bank transfer", "Credit card", "Check", "PayPal", "Cash", "Other"];

function RecordPaymentModal({ open, onClose }) {
  const { data: invoices } = useInvoices();
  const { create } = usePaymentMutations();
  const [form, setForm] = useState({ invoiceId: "", amount: "", method: "Bank transfer", paid_on: "", notes: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Unpaid invoices first — those are what you'd normally record against.
  const options = useMemo(
    () => (invoices || []).filter((i) => i.effective_status !== "paid").concat((invoices || []).filter((i) => i.effective_status === "paid")),
    [invoices]
  );

  useEffect(() => {
    if (open) {
      setForm({ invoiceId: "", amount: "", method: "Bank transfer", paid_on: new Date().toISOString().slice(0, 10), notes: "" });
      setErr("");
    }
  }, [open]);

  function pickInvoice(id) {
    const inv = (invoices || []).find((i) => i.id === id);
    setForm((f) => ({ ...f, invoiceId: id, amount: inv ? inv.total : f.amount }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.invoiceId) return setErr("Select an invoice");
    if (!(Number(form.amount) > 0)) return setErr("Enter a valid amount");
    setSaving(true);
    setErr("");
    try {
      await create.mutateAsync({ ...form, amount: Number(form.amount) });
      onClose();
    } catch (ex) {
      setErr(ex.message || "Couldn't record payment");
    } finally {
      setSaving(false);
    }
  }

  const selectClass = "h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15";

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[var(--ink)]/30 backdrop-blur-sm" onClick={onClose} />
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[480px] rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-hover p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold tracking-tight">Record payment</h3>
              <button type="button" onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <Field label="Invoice *">
                <select className={selectClass} value={form.invoiceId} onChange={(e) => pickInvoice(e.target.value)}>
                  <option value="">— Select an invoice —</option>
                  {options.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.invoice_number} · {i.client_name || "No client"} · {formatMoney(i.total, i.currency)}{i.effective_status === "paid" ? " (paid)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount *">
                  <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="tabular" placeholder="0.00" />
                </Field>
                <Field label="Date">
                  <Input type="date" value={form.paid_on} onChange={(e) => setForm((f) => ({ ...f, paid_on: e.target.value }))} />
                </Field>
              </div>
              <Field label="Method">
                <select className={selectClass} value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                  {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Notes">
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Reference / memo" />
              </Field>
            </div>
            {err && <p className="text-sm text-[var(--danger)] mt-3">{err}</p>}
            <div className="flex items-center justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="accent" disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                Record payment
              </Button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--ink-muted)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}
