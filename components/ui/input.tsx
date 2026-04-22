import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-[var(--border)] bg-[#0b1322] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[#73839b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };

