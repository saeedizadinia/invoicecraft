import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  ScanLine,
  Package,
  X,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useClients } from "@/hooks/useClients";
import { useSettings } from "@/hooks/useSettings";
import { useItems } from "@/hooks/useFeatures";
import {
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
} from "@/hooks/useInvoices";
import { aiApi } from "@/api/ai";
import { CURRENCIES, formatMoney, toDateInput, cn } from "@/lib/utils";

const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const blankItem = () => ({ description: "", quantity: 1, rate: 0 });

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function plusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectClient = searchParams.get("client") || "";

  const { data: clients } = useClients();
  const { data: settings } = useSettings();
  const { data: existing, isLoading: loadingInvoice } = useInvoice(id);
  const create = useCreateInvoice();
  const update = useUpdateInvoice();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Initialize the form (from settings for new, from existing for edit).
  useEffect(() => {
    if (isEdit) {
      if (existing && !form) {
        setForm({
          client_id: existing.client_id || "",
          status: existing.status,
          issue_date: toDateInput(existing.issue_date) || todayISO(),
          due_date: toDateInput(existing.due_date) || "",
          currency: existing.currency,
          tax_rate: Number(existing.tax_rate) || 0,
          discount: Number(existing.discount) || 0,
          notes: existing.notes || "",
          terms: existing.terms || "",
          items: existing.items?.length
            ? existing.items.map((it) => ({
                description: it.description,
                quantity: Number(it.quantity),
                rate: Number(it.rate),
              }))
            : [blankItem()],
        });
      }
    } else if (!form && settings) {
      setForm({
        client_id: preselectClient,
        status: "draft",
        issue_date: todayISO(),
        due_date: plusDays(30),
        currency: settings.currency || "USD",
        tax_rate: Number(settings.tax_rate) || 0,
        discount: 0,
        notes: "",
        terms: "Payment due within 30 days.",
        items: [blankItem()],
      });
    }
  }, [isEdit, existing, settings, form]);

  const totals = useMemo(() => {
    if (!form) return { subtotal: 0, taxAmount: 0, total: 0 };
    const subtotal = round(
      form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0)
    );
    const disc = Math.min(round(Number(form.discount) || 0), subtotal);
    const base = round(subtotal - disc);
    const taxAmount = round((base * (Number(form.tax_rate) || 0)) / 100);
    return { subtotal, discount: disc, taxAmount, total: round(base + taxAmount) };
  }, [form]);

  if (!form || (isEdit && loadingInvoice)) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--ink-muted)]">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setItem = (i, patch) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }));
  const addCatalogItem = (it) =>
    setForm((f) => {
      const line = { description: it.name, quantity: 1, rate: Number(it.rate) || 0 };
      // Replace a leading blank row, otherwise append.
      const items = [...f.items];
      const blankIdx = items.findIndex((x) => !x.description.trim() && !Number(x.rate));
      if (blankIdx >= 0) items[blankIdx] = line;
      else items.push(line);
      return { ...f, items };
    });
  const removeItem = (i) =>
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, idx) => idx !== i).length
        ? f.items.filter((_, idx) => idx !== i)
        : [blankItem()],
    }));

  async function onSave(overrideStatus) {
    setErr("");
    const payload = {
      ...form,
      status: overrideStatus || form.status,
      client_id: form.client_id || null,
      tax_rate: Number(form.tax_rate) || 0,
      discount: Number(form.discount) || 0,
      due_date: form.due_date || undefined,
      issue_date: form.issue_date || undefined,
      items: form.items
        .filter((it) => it.description.trim() || Number(it.rate) > 0)
        .map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 0,
          rate: Number(it.rate) || 0,
        })),
    };
    setSaving(true);
    try {
      const inv = isEdit
        ? await update.mutateAsync({ id, payload })
        : await create.mutateAsync(payload);
      nav(`/invoices/${inv.id}`);
    } catch (e) {
      setErr(e.message || "Couldn't save invoice");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15";
  const symbol = CURRENCIES.find((c) => c.code === form.currency)?.symbol || "$";

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            className="h-9 w-9 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] shadow-card"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {isEdit ? "Edit invoice" : "New invoice"}
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {isEdit ? existing?.invoice_number : "A number is assigned automatically on save"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onSave("draft")} disabled={saving}>
            Save draft
          </Button>
          <Button variant="accent" onClick={() => onSave()} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save
          </Button>
        </div>
      </div>

      {err && (
        <div className="mb-4 text-sm text-[var(--danger)] bg-[var(--danger)]/10 rounded-2xl px-4 py-3">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — main details */}
        <div className="lg:col-span-2 space-y-5">
          {/* meta */}
          <Card padding="lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Client">
                <select
                  className={selectClass}
                  value={form.client_id}
                  onChange={(e) => set({ client_id: e.target.value })}
                >
                  <option value="">— No client —</option>
                  {(clients || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` (${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={selectClass}
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                </select>
              </Field>
              <Field label="Issue date">
                <Input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => set({ issue_date: e.target.value })}
                />
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set({ due_date: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          {/* line items */}
          <Card padding="lg">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <CardTitle>Line items</CardTitle>
              <div className="flex items-center gap-2">
                <CatalogPicker onPick={addCatalogItem} />
                <ReceiptScanButton
                onParsed={(res) => {
                  set({
                    items: res.lineItems?.length
                      ? res.lineItems.map((li) => ({
                          description: li.description || res.vendor || "Item",
                          quantity: Number(li.quantity) || 1,
                          rate: Number(li.rate) || 0,
                        }))
                      : [
                          {
                            description: res.vendor || "Expense",
                            quantity: 1,
                            rate: Number(res.total) || 0,
                          },
                        ],
                    notes: res.notes || form.notes,
                  });
                }}
                />
              </div>
            </div>

            {/* header row */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_110px_110px_32px] gap-3 px-1 pb-2 text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
              <span></span>
            </div>

            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 sm:grid-cols-[1fr_80px_110px_110px_32px] gap-3 items-center"
                >
                  <Input
                    className="col-span-2 sm:col-span-1 rounded-xl"
                    placeholder="Description of work or item"
                    value={it.description}
                    onChange={(e) => setItem(i, { description: e.target.value })}
                  />
                  <Input
                    className="rounded-xl text-right tabular"
                    type="number"
                    min="0"
                    step="1"
                    value={it.quantity}
                    onChange={(e) => setItem(i, { quantity: e.target.value })}
                  />
                  <Input
                    className="rounded-xl text-right tabular"
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.rate}
                    onChange={(e) => setItem(i, { rate: e.target.value })}
                  />
                  <div className="text-right text-sm font-semibold tabular text-[var(--ink)] pr-1">
                    {formatMoney((Number(it.quantity) || 0) * (Number(it.rate) || 0), form.currency)}
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-2)] justify-self-end"
                    title="Remove line"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <Button variant="ghost" size="sm" className="mt-3" onClick={addItem}>
              <Plus size={14} /> Add line item
            </Button>
          </Card>

          {/* notes */}
          <Card padding="lg" className="space-y-4">
            <NoteField
              label="Notes"
              value={form.notes}
              onChange={(v) => set({ notes: v })}
              placeholder="Notes visible to the client..."
              aiKind="description"
              aiContext={{ items: form.items, client: clientById(clients, form.client_id) }}
            />
            <NoteField
              label="Payment terms"
              value={form.terms}
              onChange={(v) => set({ terms: v })}
              placeholder="e.g. Payment due within 30 days."
              aiKind="terms"
              aiContext={{ items: form.items }}
            />
          </Card>
        </div>

        {/* Right — totals */}
        <div className="space-y-5">
          <Card padding="lg" className="lg:sticky lg:top-4">
            <CardTitle className="mb-4">Summary</CardTitle>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Currency">
                <select
                  className={selectClass}
                  value={form.currency}
                  onChange={(e) => set({ currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tax %">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.tax_rate}
                  onChange={(e) => set({ tax_rate: e.target.value })}
                  className="tabular"
                />
              </Field>
            </div>
            <Field label={`Discount (${symbol})`} className="mb-4">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(e) => set({ discount: e.target.value })}
                className="tabular"
              />
            </Field>

            <div className="space-y-2 pt-4 border-t border-[var(--border)] text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotal, form.currency)} />
              {totals.discount > 0 && (
                <Row label="Discount" value={`− ${formatMoney(totals.discount, form.currency)}`} />
              )}
              <Row
                label={`Tax (${Number(form.tax_rate) || 0}%)`}
                value={formatMoney(totals.taxAmount, form.currency)}
              />
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--border)]">
                <span className="font-display font-semibold">Total</span>
                <span className="font-display text-xl font-semibold tabular text-[var(--accent-strong)]">
                  {formatMoney(totals.total, form.currency)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function clientById(clients, id) {
  return (clients || []).find((c) => c.id === id) || null;
}

function Field({ label, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs font-medium text-[var(--ink-muted)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <span className="tabular text-[var(--ink)]">{value}</span>
    </div>
  );
}

function NoteField({ label, value, onChange, placeholder, aiKind, aiContext }) {
  const [loading, setLoading] = useState(false);
  async function writeWithAI() {
    setLoading(true);
    try {
      const text = await aiApi.writeNote({
        kind: aiKind,
        prompt: value?.trim() || undefined,
        items: (aiContext?.items || []).filter((it) => it.description),
        client: aiContext?.client ? { name: aiContext.client.name } : undefined,
      });
      onChange(text);
    } catch {
      /* surfaced elsewhere; keep field intact */
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[var(--ink-muted)]">{label}</span>
        <button
          onClick={writeWithAI}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-strong)] hover:underline disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          Write with AI
        </button>
      </div>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none resize-y focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15"
      />
    </div>
  );
}

function CatalogPicker({ onPick }) {
  const { data: items } = useItems();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!items?.length) return null;

  return (
    <div ref={ref} className="relative">
      <Button type="button" variant="soft" size="sm" onClick={() => setOpen((v) => !v)}>
        <Package size={13} /> From catalog
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-64 max-h-72 overflow-y-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-hover p-1.5">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                onPick(it);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="text-sm text-[var(--ink)] truncate">{it.name}</span>
              <span className="text-xs font-semibold tabular text-[var(--accent-strong)] shrink-0">
                {formatMoney(it.rate)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReceiptScanButton({ onParsed }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setLoading(true);
    try {
      const res = await aiApi.receiptParse(file);
      onParsed(res);
    } catch (ex) {
      setErr(ex.message || "Couldn't read receipt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {err && (
        <span className="text-[11px] text-[var(--danger)] flex items-center gap-1">
          {err}
          <button onClick={() => setErr("")}>
            <X size={11} />
          </button>
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onFile}
      />
      <Button variant="soft" size="sm" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? <Loader2 size={13} className="animate-spin" /> : <ScanLine size={13} />}
        Scan receipt
      </Button>
    </div>
  );
}
