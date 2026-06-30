// Minimal chart container — we use Recharts directly in panel components.
// The original shadcn chart wrapper is incompatible with Recharts v3 types.
import * as React from "react";

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
));
ChartContainer.displayName = "ChartContainer";
