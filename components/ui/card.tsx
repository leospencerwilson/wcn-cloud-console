import * as React from "react";
import { cn } from "@/lib/utils";

function Crosshair({ position }: { position: "tl" | "br" }) {
  return (
    <span
      aria-hidden
      className={cn("crosshair", position === "tl" ? "crosshair-tl" : "crosshair-br")}
    >
      <svg
        viewBox="0 0 8 8"
        width={8}
        height={8}
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="4" y1="0" x2="4" y2="8" stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1" />
      </svg>
    </span>
  );
}

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("surface-card", className)} {...props}>
      <Crosshair position="tl" />
      {children}
      <Crosshair position="br" />
    </div>
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-8 pt-8 pb-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("type-h2", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("mt-3 text-[15px] leading-[1.55] text-charcoal/70", className)}
      style={{ color: "var(--color-muted)" }}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-8 pb-8 pt-2", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-8 pb-8 pt-2 flex items-center", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export default Card;
