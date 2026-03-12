import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "multi-select" | "date-range";
  options?: { value: string; label: string }[];
}

interface AdvancedFiltersProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

function countActiveFilters(
  filters: FilterConfig[],
  values: Record<string, any>,
): number {
  return filters.reduce((count, filter) => {
    const val = values[filter.key];
    if (filter.type === "multi-select") {
      return count + (Array.isArray(val) && val.length > 0 ? 1 : 0);
    }
    if (filter.type === "date-range") {
      const start = values[`${filter.key}_start`];
      const end = values[`${filter.key}_end`];
      return count + (start || end ? 1 : 0);
    }
    return count + (val ? 1 : 0);
  }, 0);
}

export function AdvancedFilters({
  filters,
  values,
  onChange,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters, values);

  const handleReset = () => {
    const cleared: Record<string, any> = {};
    filters.forEach((filter) => {
      if (filter.type === "date-range") {
        cleared[`${filter.key}_start`] = "";
        cleared[`${filter.key}_end`] = "";
      } else if (filter.type === "multi-select") {
        cleared[filter.key] = [];
      } else {
        cleared[filter.key] = "";
      }
    });
    onChange(cleared);
  };

  const handleSelectChange = (key: string, value: string) => {
    onChange({ ...values, [key]: value === "__all__" ? "" : value });
  };

  const handleMultiToggle = (key: string, optionValue: string) => {
    const current: string[] = Array.isArray(values[key]) ? values[key] : [];
    const next = current.includes(optionValue)
      ? current.filter((v: string) => v !== optionValue)
      : [...current, optionValue];
    onChange({ ...values, [key]: next });
  };

  const handleDateChange = (
    key: string,
    bound: "start" | "end",
    value: string,
  ) => {
    onChange({ ...values, [`${key}_${bound}`]: value });
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn(activeCount > 0 && "border-primary text-primary")}
      >
        <Filter className="w-4 h-4 mr-2" />
        Filtres{activeCount > 0 ? ` (${activeCount})` : ""}
      </Button>

      {open && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  {filter.label}
                </label>

                {filter.type === "select" && (
                  <Select
                    value={values[filter.key] || "__all__"}
                    onValueChange={(val) =>
                      handleSelectChange(filter.key, val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous</SelectItem>
                      {filter.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filter.type === "multi-select" && (
                  <div className="flex flex-wrap gap-1.5">
                    {filter.options?.map((opt) => {
                      const selected = (
                        Array.isArray(values[filter.key])
                          ? values[filter.key]
                          : []
                      ).includes(opt.value);
                      return (
                        <Badge
                          key={opt.value}
                          variant={selected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer select-none",
                            !selected && "hover:bg-muted",
                          )}
                          onClick={() =>
                            handleMultiToggle(filter.key, opt.value)
                          }
                        >
                          {opt.label}
                          {selected && <X className="w-3 h-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {filter.type === "date-range" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={values[`${filter.key}_start`] || ""}
                      onChange={(e) =>
                        handleDateChange(filter.key, "start", e.target.value)
                      }
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">-</span>
                    <Input
                      type="date"
                      value={values[`${filter.key}_end`] || ""}
                      onChange={(e) =>
                        handleDateChange(filter.key, "end", e.target.value)
                      }
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {activeCount > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
