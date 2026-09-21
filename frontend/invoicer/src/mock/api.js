/**
 * Mock API — mirrors the real backend endpoints but reads/writes the in-memory
 * `store`. Each handler returns a promise with a small delay so the UI shows
 * loading states just like the real thing. Return shapes match exactly what the
 * real `api/*.js` methods resolve to (already-unwrapped), so hooks/pages need
 * no changes.
 */
import { store, computeTotals, round2, effectiveStatus, nid } from "./store";

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v) => Number(v) || 0;
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

const clientById = (id) => store.clients.find((c) => c.id === id) || null;
const invoiceById = (id) => store.invoices.find((i) => i.id === id) || null;

function serInvoiceList(inv) {
  const c = clientById(inv.client_id);
  const { items, ...rest } = inv; // eslint-disable-line no-unused-vars
  return { ...rest, client_name: c?.name || null, client_company: c?.company || "", effective_status: effectiveStatus(inv) };
}
function serInvoiceFull(inv) {
  const c = clientById(inv.client_id);
  return {
    ...clone(inv),
    client_name: c?.name || null, client_company: c?.company || "",
    client_email: c?.email || "", client_address: c?.address || "",
    effective_status: effectiveStatus(inv),
  };
}

function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${dt.getMonth()}`;
}
function lastMonths(n) {
  const now = new Date();
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({ d, label: d.toLocaleString("en-US", { month: "short" }), ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, key: `${d.getFullYear()}-${d.getMonth()}` });
  }
  return arr;
}

function reconcileInvoice(invoiceId) {
  const inv = invoiceById(invoiceId);
  if (!inv) return;
  const paid = store.payments.filter((p) => p.invoice_id === invoiceId).reduce((s, p) => s + num(p.amount), 0);
  if (paid >= num(inv.total) && num(inv.total) > 0) {
    inv.status = "paid";
    inv.paid_at = inv.paid_at || nowIso();
  } else if (inv.status === "paid") {
    inv.status = "sent";
    inv.paid_at = null;
  }
}

export const mock = {
  /* ── Auth ── */
  auth: {
    async me() {
      await delay(150);
      // Start logged out so the demo shows the login flow. `login`/`register`
      // below accept anything and drop you into the app.
      return Promise.reject({ status: 401, message: "Not authenticated" });
    },
    async login() {
      await delay();
      return { user: clone(store.user) };
    },
    async register(payload) {
      await delay();
      if (payload?.name) store.user.name = payload.name;
      if (payload?.email) store.user.email = payload.email;
      return { user: clone(store.user) };
    },
    async logout() {
      await delay(120);
      return { ok: true };
    },
    async updateProfile(payload) {
      await delay();
      if (payload?.name) store.user.name = payload.name;
      return { user: clone(store.user) };
    },
    async changePassword() {
      await delay();
      return { ok: true };
    },
  },

  /* ── Clients ── */
  clients: {
    async list() {
      await delay();
      return store.clients.map((c) => {
        const invs = store.invoices.filter((i) => i.client_id === c.id);
        return {
          ...clone(c),
          invoice_count: invs.length,
          total_billed: round2(invs.reduce((s, i) => s + i.total, 0)),
          outstanding: round2(invs.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0)),
        };
      });
    },
    async get(id) {
      await delay();
      const client = clientById(id);
      if (!client) throw { status: 404, message: "Client not found" };
      const invoices = store.invoices
        .filter((i) => i.client_id === id)
        .map((i) => ({ id: i.id, invoice_number: i.invoice_number, status: i.status, issue_date: i.issue_date, due_date: i.due_date, total: i.total, currency: i.currency, created_at: i.created_at }));
      const totalBilled = round2(invoices.reduce((s, i) => s + i.total, 0));
      const outstanding = round2(invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0));
      return { client: clone(client), invoices, stats: { totalBilled, outstanding, count: invoices.length } };
    },
    async create(payload) {
      await delay();
      const client = { id: nid("cl"), name: payload.name, email: payload.email || "", company: payload.company || "", phone: payload.phone || "", address: payload.address || "", notes: payload.notes || "", created_at: nowIso() };
      store.clients.unshift(client);
      return clone(client);
    },
    async update(id, payload) {
      await delay();
      const client = clientById(id);
      if (!client) throw { status: 404, message: "Client not found" };
      Object.assign(client, payload);
      return clone(client);
    },
    async remove(id) {
      await delay();
      store.clients = store.clients.filter((c) => c.id !== id);
      store.invoices.forEach((i) => { if (i.client_id === id) i.client_id = null; });
      return { ok: true };
    },
  },

  /* ── Invoices ── */
  invoices: {
    async list(params = {}) {
      await delay();
      const { status, client_id, search, sort = "issue_date", order = "desc" } = params;
      let list = store.invoices.slice();
      if (client_id) list = list.filter((i) => i.client_id === client_id);
      if (status && status !== "all") {
        if (status === "overdue") list = list.filter((i) => effectiveStatus(i) === "overdue");
        else if (status === "sent") list = list.filter((i) => i.status === "sent" && effectiveStatus(i) !== "overdue");
        else list = list.filter((i) => i.status === status);
      }
      if (search) {
        const q = String(search).toLowerCase();
        list = list.filter((i) => {
          const c = clientById(i.client_id);
          return i.invoice_number.toLowerCase().includes(q) || (c?.name || "").toLowerCase().includes(q);
        });
      }
      const dir = order === "asc" ? 1 : -1;
      list.sort((a, b) => {
        let av, bv;
        if (sort === "total") { av = a.total; bv = b.total; }
        else { av = new Date(a[sort] || 0).getTime(); bv = new Date(b[sort] || 0).getTime(); }
        return (av - bv) * dir;
      });
      return list.map(serInvoiceList);
    },
    async get(id) {
      await delay();
      const inv = invoiceById(id);
      if (!inv) throw { status: 404, message: "Invoice not found" };
      return serInvoiceFull(inv);
    },
    async create(payload) {
      await delay();
      const totals = computeTotals(payload.items, payload.tax_rate, payload.discount);
      const number = payload.invoice_number || `${store.settings.invoice_prefix}${String(store.settings.next_seq).padStart(4, "0")}`;
      if (!payload.invoice_number) store.settings.next_seq += 1;
      const inv = {
        id: nid("inv"), client_id: payload.client_id || null, invoice_number: number,
        status: payload.status || "draft", issue_date: payload.issue_date || todayStr(), due_date: payload.due_date || null,
        currency: payload.currency || "USD", tax_rate: num(payload.tax_rate), discount: totals.discount,
        subtotal: totals.subtotal, tax_amount: totals.taxAmount, total: totals.total,
        notes: payload.notes || "", terms: payload.terms || "",
        paid_at: payload.status === "paid" ? nowIso() : null, created_at: nowIso(),
        items: totals.items.map((it) => ({ id: nid("li"), ...it })),
      };
      store.invoices.unshift(inv);
      return serInvoiceFull(inv);
    },
    async update(id, payload) {
      await delay();
      const inv = invoiceById(id);
      if (!inv) throw { status: 404, message: "Invoice not found" };
      const taxRate = payload.tax_rate ?? inv.tax_rate;
      const discount = payload.discount ?? inv.discount;
      const fields = ["client_id", "invoice_number", "issue_date", "due_date", "currency", "notes", "terms"];
      fields.forEach((f) => { if (payload[f] !== undefined) inv[f] = payload[f] || (f === "client_id" || f === "due_date" ? null : ""); });
      if (payload.status !== undefined) {
        inv.status = payload.status;
        inv.paid_at = payload.status === "paid" ? nowIso() : null;
      }
      if (payload.items) {
        const t = computeTotals(payload.items, taxRate, discount);
        inv.tax_rate = num(taxRate); inv.discount = t.discount; inv.subtotal = t.subtotal; inv.tax_amount = t.taxAmount; inv.total = t.total;
        inv.items = t.items.map((it) => ({ id: nid("li"), ...it }));
      } else if (payload.tax_rate !== undefined || payload.discount !== undefined) {
        const t = computeTotals(inv.items, taxRate, discount);
        inv.tax_rate = num(taxRate); inv.discount = t.discount; inv.subtotal = t.subtotal; inv.tax_amount = t.taxAmount; inv.total = t.total;
      }
      return serInvoiceFull(inv);
    },
    async setStatus(id, status) {
      await delay(160);
      const inv = invoiceById(id);
      if (!inv) throw { status: 404, message: "Invoice not found" };
      inv.status = status;
      inv.paid_at = status === "paid" ? nowIso() : null;
      return serInvoiceFull(inv);
    },
    async remove(id) {
      await delay();
      store.invoices = store.invoices.filter((i) => i.id !== id);
      store.payments = store.payments.filter((p) => p.invoice_id !== id);
      return { ok: true };
    },
  },

  /* ── Dashboard ── */
  dashboard: {
    async get() {
      await delay();
      const inv = store.invoices;
      const thisMonth = monthKey(new Date());
      const totalRevenue = round2(inv.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0));
      const outstanding = round2(inv.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0));
      const paidThisMonth = round2(inv.filter((i) => i.status === "paid" && monthKey(i.paid_at || i.issue_date) === thisMonth).reduce((s, i) => s + i.total, 0));
      const overdue = inv.filter((i) => effectiveStatus(i) === "overdue");
      const series = lastMonths(6).map((m) => ({
        label: m.label, ym: m.ym,
        revenue: round2(inv.filter((i) => i.status === "paid" && monthKey(i.paid_at || i.issue_date) === m.key).reduce((s, i) => s + i.total, 0)),
        count: inv.filter((i) => i.status === "paid" && monthKey(i.paid_at || i.issue_date) === m.key).length,
      }));
      const recent = store.invoices.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(serInvoiceList);
      return {
        stats: {
          totalRevenue, outstanding, paidThisMonth,
          overdueCount: overdue.length, overdueTotal: round2(overdue.reduce((s, i) => s + i.total, 0)),
          invoiceCount: inv.length, clientCount: store.clients.length,
        },
        revenueSeries: series,
        recentInvoices: recent,
      };
    },
  },

  /* ── Settings ── */
  settings: {
    async get() {
      await delay(150);
      return clone(store.settings);
    },
    async update(payload) {
      await delay();
      Object.assign(store.settings, payload);
      return clone(store.settings);
    },
  },

  /* ── Catalog items ── */
  items: {
    async list() {
      await delay();
      return store.items.map(clone).sort((a, b) => a.name.localeCompare(b.name));
    },
    async create(payload) {
      await delay();
      const item = { id: nid("it"), name: payload.name, description: payload.description || "", rate: num(payload.rate), unit: payload.unit || "" };
      store.items.push(item);
      return clone(item);
    },
    async update(id, payload) {
      await delay();
      const item = store.items.find((i) => i.id === id);
      if (!item) throw { status: 404, message: "Item not found" };
      Object.assign(item, payload, { rate: payload.rate !== undefined ? num(payload.rate) : item.rate });
      return clone(item);
    },
    async remove(id) {
      await delay();
      store.items = store.items.filter((i) => i.id !== id);
      return { ok: true };
    },
  },

  /* ── Expenses ── */
  expenses: {
    async list(params = {}) {
      await delay();
      let list = store.expenses.slice();
      if (params.category && params.category !== "all") list = list.filter((e) => e.category === params.category);
      if (params.month) list = list.filter((e) => e.expense_date.slice(0, 7) === params.month);
      list.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
      const all = store.expenses;
      const thisMonth = new Date().toISOString().slice(0, 7);
      return {
        expenses: list.map(clone),
        totals: {
          total: round2(all.reduce((s, e) => s + e.amount, 0)),
          thisMonth: round2(all.filter((e) => e.expense_date.slice(0, 7) === thisMonth).reduce((s, e) => s + e.amount, 0)),
        },
        categories: [...new Set(all.map((e) => e.category).filter(Boolean))].sort(),
      };
    },
    async create(payload) {
      await delay();
      const exp = { id: nid("exp"), vendor: payload.vendor || "", category: payload.category || "General", expense_date: payload.expense_date || todayStr(), amount: num(payload.amount), currency: payload.currency || "USD", notes: payload.notes || "", created_at: nowIso() };
      store.expenses.unshift(exp);
      return clone(exp);
    },
    async update(id, payload) {
      await delay();
      const exp = store.expenses.find((e) => e.id === id);
      if (!exp) throw { status: 404, message: "Expense not found" };
      Object.assign(exp, payload, { amount: payload.amount !== undefined ? num(payload.amount) : exp.amount });
      return clone(exp);
    },
    async remove(id) {
      await delay();
      store.expenses = store.expenses.filter((e) => e.id !== id);
      return { ok: true };
    },
  },

  /* ── Payments ── */
  payments: {
    async list() {
      await delay();
      const rows = store.payments
        .map((p) => {
          const inv = invoiceById(p.invoice_id);
          const c = inv ? clientById(inv.client_id) : null;
          return { ...clone(p), invoice_number: inv?.invoice_number || "—", invoice_total: inv?.total || 0, client_name: c?.name || null };
        })
        .sort((a, b) => new Date(b.paid_on) - new Date(a.paid_on));
      const thisMonth = new Date().toISOString().slice(0, 7);
      return {
        payments: rows,
        totals: {
          total: round2(store.payments.reduce((s, p) => s + p.amount, 0)),
          thisMonth: round2(store.payments.filter((p) => p.paid_on.slice(0, 7) === thisMonth).reduce((s, p) => s + p.amount, 0)),
        },
      };
    },
    async create(payload) {
      await delay();
      const inv = invoiceById(payload.invoiceId);
      if (!inv) throw { status: 404, message: "Invoice not found" };
      const payment = { id: nid("pay"), invoice_id: payload.invoiceId, amount: num(payload.amount), method: payload.method || "", paid_on: payload.paid_on || todayStr(), notes: payload.notes || "", created_at: nowIso() };
      store.payments.unshift(payment);
      reconcileInvoice(payload.invoiceId);
      return clone(payment);
    },
    async remove(id) {
      await delay();
      const p = store.payments.find((x) => x.id === id);
      store.payments = store.payments.filter((x) => x.id !== id);
      if (p) reconcileInvoice(p.invoice_id);
      return { ok: true };
    },
  },

  /* ── Reports ── */
  reports: {
    async get() {
      await delay();
      const inv = store.invoices;
      const revenue = round2(inv.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0));
      const expenses = round2(store.expenses.reduce((s, e) => s + e.amount, 0));
      const outstanding = round2(inv.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0));
      const monthly = lastMonths(6).map((m) => ({
        label: m.label, ym: m.ym,
        revenue: round2(inv.filter((i) => i.status === "paid" && monthKey(i.paid_at || i.issue_date) === m.key).reduce((s, i) => s + i.total, 0)),
        expenses: round2(store.expenses.filter((e) => monthKey(e.expense_date) === m.key).reduce((s, e) => s + e.amount, 0)),
      }));

      const daysOverdue = (i) => Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000);
      const sentUnpaid = inv.filter((i) => i.status === "sent");
      const bucketSum = (lo, hi) => round2(sentUnpaid.filter((i) => i.due_date && daysOverdue(i) >= lo && daysOverdue(i) <= hi).reduce((s, i) => s + i.total, 0));
      const currentSum = round2(sentUnpaid.filter((i) => !i.due_date || daysOverdue(i) < 1).reduce((s, i) => s + i.total, 0));
      const aging = [
        { bucket: "Current", value: currentSum },
        { bucket: "1–30d", value: bucketSum(1, 30) },
        { bucket: "31–60d", value: bucketSum(31, 60) },
        { bucket: "61–90d", value: bucketSum(61, 90) },
        { bucket: "90d+", value: round2(sentUnpaid.filter((i) => i.due_date && daysOverdue(i) > 90).reduce((s, i) => s + i.total, 0)) },
      ];

      const byClient = {};
      inv.forEach((i) => {
        if (!i.client_id) return;
        byClient[i.client_id] = byClient[i.client_id] || { billed: 0, paid: 0 };
        byClient[i.client_id].billed += i.total;
        if (i.status === "paid") byClient[i.client_id].paid += i.total;
      });
      const topClients = Object.entries(byClient)
        .map(([id, v]) => ({ id, name: clientById(id)?.name || "—", billed: round2(v.billed), paid: round2(v.paid) }))
        .sort((a, b) => b.billed - a.billed)
        .slice(0, 5);

      const sumStatus = (fn) => round2(inv.filter(fn).reduce((s, i) => s + i.total, 0));
      const statusBreakdown = [
        { name: "Draft", key: "draft", value: sumStatus((i) => i.status === "draft") },
        { name: "Sent", key: "sent", value: sumStatus((i) => i.status === "sent" && effectiveStatus(i) !== "overdue") },
        { name: "Overdue", key: "overdue", value: sumStatus((i) => effectiveStatus(i) === "overdue") },
        { name: "Paid", key: "paid", value: sumStatus((i) => i.status === "paid") },
      ];

      return {
        totals: { revenue, expenses, netProfit: round2(revenue - expenses), outstanding, invoiceCount: inv.length },
        monthly, aging, topClients, statusBreakdown,
      };
    },
  },

  /* ── AI (canned responses — no Gemini in the boilerplate) ── */
  ai: {
    async receiptParse() {
      await delay(1100);
      const samples = [
        { vendor: "Adobe Inc.", currency: "USD", category: "Software", subtotal: 94.97, tax: 6.88, total: 101.85, notes: "", lineItems: [{ description: "Creative Cloud All Apps", quantity: 1, rate: 54.99 }, { description: "Adobe Stock — 10 credits", quantity: 1, rate: 29.99 }, { description: "Extra storage (1TB)", quantity: 1, rate: 9.99 }] },
        { vendor: "Blue Bottle Coffee", currency: "USD", category: "Meals", subtotal: 21, tax: 1.84, total: 22.84, notes: "", lineItems: [{ description: "Cappuccino", quantity: 2, rate: 5.5 }, { description: "Almond Croissant", quantity: 1, rate: 4.75 }, { description: "Cold Brew (L)", quantity: 1, rate: 5.25 }] },
        { vendor: "Amazon Web Services", currency: "USD", category: "Hosting", subtotal: 108.51, tax: 0, total: 108.51, notes: "Monthly usage", lineItems: [{ description: "EC2 t3.medium (hrs)", quantity: 744, rate: 0.0416 }, { description: "RDS Postgres", quantity: 744, rate: 0.034 }] },
      ];
      const idx = Math.floor((Date.now() / 1000) % samples.length);
      return { date: todayStr(), ...samples[idx] };
    },
    async businessSummary() {
      await delay(1200);
      const inv = store.invoices;
      const thisMonth = new Date().toISOString().slice(0, 7);
      const revThis = round2(inv.filter((i) => i.status === "paid" && (i.paid_at || i.issue_date).slice(0, 7) === thisMonth).reduce((s, i) => s + i.total, 0));
      const overdue = inv.filter((i) => effectiveStatus(i) === "overdue");
      const overdueTotal = round2(overdue.reduce((s, i) => s + i.total, 0));
      const top = overdue.slice().sort((a, b) => b.total - a.total)[0];
      const topName = top ? (store.clients.find((c) => c.id === top.client_id)?.name || "a client") : null;
      const summary =
        `You've collected $${revThis.toLocaleString()} this month. ` +
        (overdue.length
          ? `There ${overdue.length === 1 ? "is" : "are"} ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totaling $${overdueTotal.toLocaleString()}. Consider following up with ${topName} on invoice ${top.invoice_number}.`
          : `Nothing is overdue — nicely done. Keep the momentum going.`);
      return { summary, data: { revenueThisMonth: revThis, overdueCount: overdue.length, overdueTotal } };
    },
    async paymentReminder(invoiceId, tone = "friendly") {
      await delay(1000);
      const inv = invoiceById(invoiceId);
      const c = inv ? store.clients.find((x) => x.id === inv.client_id) : null;
      const amount = inv ? `$${inv.total.toLocaleString()}` : "$0";
      const name = c?.name || "there";
      const num2 = inv?.invoice_number || "your invoice";
      const bodies = {
        friendly: `Hi ${name},\n\nJust a friendly reminder that invoice ${num2} for ${amount} is now due. If you've already sent payment, please disregard this note — otherwise, we'd appreciate it whenever you get a chance.\n\nThank you!\nChen Studio`,
        firm: `Hi ${name},\n\nThis is a reminder that invoice ${num2} for ${amount} is past due. Please arrange payment at your earliest convenience to keep your account in good standing.\n\nRegards,\nChen Studio`,
        final: `Hi ${name},\n\nThis is a final notice regarding invoice ${num2} for ${amount}, which is significantly overdue. Please settle the outstanding balance immediately to avoid further action.\n\nChen Studio`,
      };
      return { draft: { subject: `Reminder: Invoice ${num2} (${amount})`, body: bodies[tone] || bodies.friendly }, meta: { daysOverdue: 0, to: c?.email || "" } };
    },
    async writeNote(payload) {
      await delay(900);
      if (payload?.kind === "terms") {
        return "Payment is due within 30 days of the invoice date. A late fee of 1.5% per month may apply to overdue balances. Thank you for your business.";
      }
      return "Professional design and development services delivered per the agreed scope, including implementation, review, and handoff.";
    },
  },
};
