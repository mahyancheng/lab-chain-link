import { useId } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { STAGE_LABEL } from "@/lib/stages";

export interface OrdersFilterValue {
  q: string;
  stage: string; // "all" or a stage key
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export const EMPTY_FILTERS: OrdersFilterValue = { q: "", stage: "all", from: "", to: "" };

export function OrdersFilterBar({
  value,
  onChange,
  stages,
  searchPlaceholder = "Search by order #, status, notes…",
  className,
}: {
  value: OrdersFilterValue;
  onChange: (next: OrdersFilterValue) => void;
  stages: string[];
  searchPlaceholder?: string;
  className?: string;
}) {
  const fromId = useId();
  const toId = useId();
  const isDirty =
    value.q !== "" || value.stage !== "all" || value.from !== "" || value.to !== "";

  return (
    <Card className={`mb-4 p-3 ${className ?? ""}`}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            placeholder={searchPlaceholder}
            className="pl-8"
          />
        </div>
        <div className="w-full sm:w-auto">
          <Select
            value={value.stage}
            onValueChange={(v) => onChange({ ...value, stage: v })}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABEL[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col">
          <label htmlFor={fromId} className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            From
          </label>
          <Input
            id={fromId}
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="w-[150px]"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor={toId} className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            To
          </label>
          <Input
            id={toId}
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="w-[150px]"
          />
        </div>
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </Card>
  );
}

export function filterOrders<
  T extends {
    order_number: string;
    stage: string;
    created_at: string;
    delivery_type?: string | null;
    notes?: string | null;
    total?: number | string | null;
  },
>(rows: T[], f: OrdersFilterValue): T[] {
  const q = f.q.trim().toLowerCase();
  const fromTs = f.from ? new Date(f.from + "T00:00:00").getTime() : null;
  const toTs = f.to ? new Date(f.to + "T23:59:59.999").getTime() : null;
  return rows.filter((r) => {
    if (f.stage !== "all" && r.stage !== f.stage) return false;
    const t = new Date(r.created_at).getTime();
    if (fromTs !== null && t < fromTs) return false;
    if (toTs !== null && t > toTs) return false;
    if (q) {
      const hay = [
        r.order_number,
        r.stage,
        STAGE_LABEL[r.stage] ?? "",
        r.delivery_type ?? "",
        r.notes ?? "",
        r.total != null ? String(r.total) : "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
