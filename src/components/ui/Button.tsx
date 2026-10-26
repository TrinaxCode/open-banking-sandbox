import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-zinc-950 font-bold shadow-glow hover:bg-primary-400 active:bg-primary-600",
  secondary:
    "bg-zinc-100 text-zinc-900 border border-zinc-200/80 hover:bg-zinc-200 dark:glass dark:glass-hover dark:text-white dark:border-white/[0.06]",
  outline:
    "border border-zinc-300 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 hover:border-zinc-400 dark:border-white/[0.16] dark:text-zinc-200 dark:hover:text-white dark:hover:bg-white/[0.08] dark:hover:border-white/[0.25]",
  ghost:
    "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center rounded-xl font-semibold
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-[#0a0a0a]
          disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-100
          active:scale-[0.97]
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `.trim()}
        {...props}
      >
        {isLoading && (
          <svg
            className="-ml-1 mr-2 h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
