import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "highlight" | "glass";
}

const variantStyles = {
  default: "glass-card bg-white/90 dark:bg-white/[0.03]",
  highlight:
    "glass-card bg-white/90 dark:bg-white/[0.03] border-primary-500/20 shadow-glow",
  glass: "glass-card bg-white/60 dark:bg-white/[0.01]",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          animate-fade-in p-6
          ${variantStyles[variant]}
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
