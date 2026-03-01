import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SearchInput } from "./SearchInput";
import { cn } from "@/lib/utils";

interface DataTableContainerProps {
  title?: string;
  actions?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children: React.ReactNode;
  className?: string;
}

export function DataTableContainer({
  title,
  actions,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  children,
  className,
}: DataTableContainerProps) {
  const showHeader = title || actions || (searchValue !== undefined && onSearchChange);

  return (
    <Card className={cn("overflow-hidden", className)}>
      {showHeader && (
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div className="flex items-center gap-3">
            {title && <h3 className="font-semibold text-base">{title}</h3>}
          </div>
          <div className="flex items-center gap-2">
            {searchValue !== undefined && onSearchChange && (
              <SearchInput
                value={searchValue}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                className="w-64"
              />
            )}
            {actions}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(showHeader ? "pt-0" : "")}>
        {children}
      </CardContent>
    </Card>
  );
}
