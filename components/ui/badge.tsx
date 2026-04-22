import * as React from "react";

import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[#2f3744] bg-[#1d2430] px-2.5 py-0.5 text-xs font-medium text-[#c9d1d9]",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
