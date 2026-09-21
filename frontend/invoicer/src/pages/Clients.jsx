import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Search, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClientFormModal } from "@/components/clients/ClientFormModal";
import { useClients } from "@/hooks/useClients";
import { formatMoney } from "@/lib/utils";

export default function Clients() {
  const nav = useNavigate();
  const { data, isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const clients = (data || []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Everyone you bill, with their totals at a glance."
        actions={
          <Button variant="accent" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add Client
          </Button>
        }
      />

      {(data?.length || 0) > 0 && (
        <div className="mb-5 md:w-[320px]">
          <SearchInput
            leftIcon={<Search size={16} />}
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-3xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No matching clients" : "No clients yet"}
          description={search ? "Try a different search." : "Add your first client to start invoicing them."}
          action={
            !search && (
              <Button variant="accent" onClick={() => setModalOpen(true)}>
                <Plus size={16} /> Add Client
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Card
              key={c.id}
              padding="lg"
              className="cursor-pointer group"
              onClick={() => nav(`/clients/${c.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center font-semibold shrink-0">
                  {c.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[var(--ink)] truncate group-hover:text-[var(--accent-strong)]">
                    {c.name}
                  </div>
                  <div className="text-xs text-[var(--ink-muted)] truncate">
                    {c.company || c.email || "—"}
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[var(--border)]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                    Total billed
                  </div>
                  <div className="text-sm font-semibold text-[var(--ink)] tabular mt-0.5">
                    {formatMoney(c.total_billed)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                    Outstanding
                  </div>
                  <div
                    className={`text-sm font-semibold tabular mt-0.5 ${
                      c.outstanding > 0 ? "text-[var(--warning)]" : "text-[var(--ink)]"
                    }`}
                  >
                    {formatMoney(c.outstanding)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ClientFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
