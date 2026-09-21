import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight tabular",
  {
    variants: {
      tone: {
        neutral:
          "bg-[var(--surface-2)] text-[var(--ink-muted)] border border-[var(--border)]",
        accent: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
        success: "bg-[var(--success)]/12 text-[var(--success)]",
        warning: "bg-[var(--warning)]/14 text-[var(--warning)]",
        danger: "bg-[var(--danger)]/12 text-[var(--danger)]",
        ink: "bg-[var(--ink)] text-[var(--bg)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

// Maps an invoice status → badge tone + label. Kept here so every table,
// list, and detail view renders status consistently.
export const INVOICE_STATUS = {
  draft: { tone: "neutral", label: "Draft" },
  sent: { tone: "accent", label: "Sent" },
  paid: { tone: "success", label: "Paid" },
  overdue: { tone: "danger", label: "Overdue" },
};

export function StatusBadge({ status, className }) {
  const s = INVOICE_STATUS[status] || INVOICE_STATUS.draft;
  return (
    <Badge tone={s.tone} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {s.label}
    </Badge>
  );
}

export { badgeVariants };
