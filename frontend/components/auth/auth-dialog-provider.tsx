"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { LoginDialog } from "@/components/auth/login-dialog";

interface AuthDialogContextValue {
  openLogin: () => void;
  closeLogin: () => void;
}

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openLogin = useCallback(() => setOpen(true), []);
  const closeLogin = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ openLogin, closeLogin }), [openLogin, closeLogin]);

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <LoginDialog open={open} onClose={closeLogin} />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog(): AuthDialogContextValue {
  const context = useContext(AuthDialogContext);
  if (!context) {
    throw new Error("useAuthDialog doit être utilisé dans AuthDialogProvider.");
  }
  return context;
}
