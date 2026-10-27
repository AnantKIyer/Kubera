import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-fade-in min-w-0">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-[15px] leading-snug text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
}
