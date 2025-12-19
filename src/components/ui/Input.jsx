import React, { forwardRef } from "react";

export const Input = forwardRef(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
          w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
          rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
          disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
          ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : ""
          }
          ${className}
        `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
