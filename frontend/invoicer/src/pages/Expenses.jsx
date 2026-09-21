import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Receipt,
  ScanLine,
  Trash2,
  Pencil,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/dashboard/StatCard";
import { useExpenses, useExpenseMutations } from "@/hooks/useFeatures";
import { aiApi } from "@/api/ai";
import { formatMoney, formatDate, toDateInput, cn } from "@/lib/utils";

export default function Expenses() {
  const [category, setCategory] = useState("all");
  const { data, isLoading } = useExpenses({ category });
  const { remove } = useExpenseMutations();
  const [modal, setModal] = useState(null); // null | expense-or-prefill
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState("");
  const fileRef = useRef(null);

  const expenses = data?.expenses || [];
  const categories = data?.categories || [];

  async function onScan(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanErr("");
    setScanning(true);
    try {
      const res = await aiApi.receiptParse(file);
      setModal({
        vendor: res.vendor || "",
        category: res.category || "General",
        expense_date: res.date || "",
        amount: res.total || res.subtotal || 0,
        notes: res.notes || (res.lineItems?.[0]?.description ?? ""),
      });
    } catch (ex) {
      setScanErr(ex.message || "Couldn't read that receipt");
    } finally {
      setScanning(false);
    }
  }

  async function onDelete(e, exp) {
    e.stopPropagation();
    if (!window.confirm(`Delete expense from ${exp.vendor || "vendor"}?`)) return;
    await remove.mutateAsync(exp.id);
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track business costs. Upload a receipt and let AI fill it in."
        actions={
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onScan} />
            <Button variant="soft" onClick={() => fileRef.current?.click()} disabled={scanning}>
              {scanning ? <Loader2 size={15} className="animate-spin" /> : <ScanLine size={15} />}
              Scan receipt
            </Button>
            <Button variant="accent" onClick={() => setModal({})}>
              <Plus size={16} /> Add Expense
            </Button>
          </div>
        }
      />

      {scanErr && (
        <div className="mb-4 text-sm text-[var(--danger)] bg-[var(--danger)]/10 rounded-2xl px-4 py-3 flex items-center gap-2">
          <Sparkles size={14} /> {scanErr}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 max-w-2xl">
        <StatCard label="Total expenses" value={formatMoney(data?.totals?.total || 0)} icon={Receipt} />
        <StatCard label="This month" value={formatMoney(data?.totals?.thisMonth || 0)} icon={Receipt} accent />
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-card w-fit mb-5 flex-wrap">
          {["all", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "h-8 px-4 rounded-full text-xs font-semibold transition-colors capitalize",
                category === c ? "bg-[var(--ink)] text-[var(--bg)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              )}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={category !== "all" ? "No expenses in this category" : "No expenses yet"}
          description="Scan a receipt or add one manually to start tracking costs."
          action={
            <Button variant="accent" onClick={() => setModal({})}>
              <Plus size={16} /> Add Expense
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] gap-4 px-5 py-3 border-b border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
            <span>Vendor</span><span>Category</span><span>Date</span><span className="text-right">Amount</span><span></span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setModal(exp)}
                className="group grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] gap-x-4 gap-y-1 px-5 py-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors items-center"
              >
                <div className="font-medium text-sm text-[var(--ink)] truncate">{exp.vendor || "—"}</div>
                <div className="order-3 md:order-none col-span-2 md:col-span-1">
                  <Badge tone="neutral" className="capitalize">{exp.category}</Badge>
                </div>
                <div className="hidden md:block text-sm text-[var(--ink-muted)] tabular">{formatDate(exp.expense_date)}</div>
                <div className="text-sm font-semibold text-[var(--ink)] tabular text-right">{formatMoney(exp.amount, exp.currency)}</div>
                <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setModal(exp); }} className="h-7 w-7 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"><Pencil size={13} /></button>
                  <button onClick={(e) => onDelete(e, exp)} className="h-7 w-7 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--danger)]"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ExpenseModal open={!!modal} expense={modal} onClose={() => setModal(null)} />
    </div>
  );
}

const CATEGORIES = ["General", "Software", "Hosting", "Meals", "Travel", "Office", "Marketing", "Equipment", "Other"];

function ExpenseModal({ open, expense, onClose }) {
  const isEdit = !!expense?.id;
  const { create, update } = useExpenseMutations();
  const [form, setForm] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        vendor: expense?.vendor || "",
        category: expense?.category || "General",
        expense_date: toDateInput(expense?.expense_date) || new Date().toISOString().slice(0, 10),
        amount: expense?.amount ?? 0,
        notes: expense?.notes || "",
      });
      setErr("");
    }
  }, [open, expense]);

  if (!form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const payload = { ...form, amount: Number(form.amount) || 0 };
      if (isEdit) await update.mutateAsync({ id: expense.id, payload });
      else await create.mutateAsync(payload);
      onClose();
    } catch (ex) {
      setErr(ex.message || "Couldn't save expense");
    } finally {
      setSaving(false);
    }
  }

  const selectClass = "h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15";
  const prefilled = open && !isEdit && (form.vendor || Number(form.amount) > 0);

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
              <h3 className="font-display text-lg font-semibold tracking-tight">{isEdit ? "Edit expense" : "Add expense"}</h3>
              <button type="button" onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"><X size={16} /></button>
            </div>
            {prefilled && (
              <div className="mb-4 flex items-center gap-2 text-xs font-medium text-[var(--accent-strong)] bg-[var(--accent-soft)] rounded-xl px-3 py-2">
                <Sparkles size={13} /> Pre-filled from your receipt — review and save.
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vendor"><Input value={form.vendor} onChange={set("vendor")} placeholder="Adobe Inc." /></Field>
                <Field label="Amount">
                  <Input type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} className="tabular" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select className={selectClass} value={form.category} onChange={set("category")}>
                    {[...new Set([form.category, ...CATEGORIES])].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Date"><Input type="date" value={form.expense_date} onChange={set("expense_date")} /></Field>
              </div>
              <Field label="Notes">
                <Input value={form.notes} onChange={set("notes")} placeholder="What was this for?" />
              </Field>
            </div>
            {err && <p className="text-sm text-[var(--danger)] mt-3">{err}</p>}
            <div className="flex items-center justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="accent" disabled={saving}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {isEdit ? "Save" : "Add expense"}
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
