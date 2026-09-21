import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, FileText, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useDashboard } from "@/hooks/useDashboard";
import { cn, relativeTime, formatMoney } from "@/lib/utils";

const TONE = {
  paid: "bg-[var(--success)]/12 text-[var(--success)]",
  overdue: "bg-[var(--danger)]/12 text-[var(--danger)]",
  sent: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  draft: "bg-[var(--surface-2)] text-[var(--ink-muted)]",
};
const ICON = {
  paid: CheckCircle2,
  overdue: AlertTriangle,
  sent: Send,
  draft: FileText,
};

export function NotificationsPopover() {
  const navigate = useNavigate();
  const { data } = useDashboard();
  const invoices = data?.recentInvoices || [];
  const overdue = data?.stats?.overdueCount || 0;

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        dot={overdue > 0}
        aria-label={`Notifications${overdue ? ` (${overdue} overdue)` : ""}`}
      >
        <Bell size={16} />
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[52px] z-40 w-[380px] rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-hover overflow-hidden"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between px-5 h-12 border-b border-[var(--border)]">
              <div className="text-sm font-semibold text-[var(--ink)]">Recent activity</div>
              {overdue > 0 && (
                <span className="text-[11px] font-semibold text-[var(--danger)] tabular-nums">
                  {overdue} overdue
                </span>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {invoices.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="h-10 w-10 mx-auto rounded-2xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-muted)] mb-3">
                    <FileText size={16} />
                  </div>
                  <div className="text-sm font-medium text-[var(--ink)]">Nothing here yet</div>
                  <div className="text-xs text-[var(--ink-muted)] mt-1">
                    New invoices and payments will show up here.
                  </div>
                </div>
              ) : (
                <ul>
                  {invoices.map((inv, idx) => {
                    const st = inv.effective_status;
                    const Icon = ICON[st] || FileText;
                    return (
                      <li key={inv.id}>
                        <button
                          onClick={() => {
                            navigate(`/invoices/${inv.id}`);
                            setOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-[var(--surface-2)] transition-colors",
                            idx > 0 && "border-t border-[var(--border)]"
                          )}
                        >
                          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", TONE[st] || TONE.draft)}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--ink)] truncate">
                              {inv.invoice_number} · {inv.client_name || "No client"}
                            </div>
                            <div className="text-[11px] text-[var(--ink-muted)] mt-0.5 truncate capitalize">
                              {st} · {formatMoney(inv.total, inv.currency)}
                            </div>
                          </div>
                          <div className="text-[10px] text-[var(--ink-muted)] shrink-0 tabular-nums mt-0.5">
                            {relativeTime(inv.created_at)}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              onClick={() => {
                navigate("/invoices");
                setOpen(false);
              }}
              className="w-full h-11 border-t border-[var(--border)] text-xs font-semibold text-[var(--accent-strong)] hover:bg-[var(--surface-2)] transition-colors"
            >
              View all invoices
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
