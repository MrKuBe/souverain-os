"use client";

import { LogIn } from "lucide-react";

import { useAuthDialog } from "@/components/auth/auth-dialog-provider";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/format";

export function LoginTrigger({
  label = "Se connecter au SIH",
  variant = "primary",
  size = "md",
  className,
}: {
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { openLogin } = useAuthDialog();
  return (
    <button
      type="button"
      onClick={openLogin}
      className={cn(buttonStyles({ variant, size }), className)}
    >
      <LogIn className="h-4 w-4" />
      {label}
    </button>
  );
}
