"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

import { cn } from "@/lib/format";

interface MethodologyTooltipProps {
  title: string;
  label: string;
  children: ReactNode;
  className?: string;
}

interface TooltipPosition {
  top: number;
  left: number;
  width: number;
}

const VIEWPORT_MARGIN = 16;
const TRIGGER_GAP = 10;

export function MethodologyTooltip({
  title,
  label,
  children,
  className,
}: MethodologyTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: VIEWPORT_MARGIN,
    width: 360,
  });

  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - VIEWPORT_MARGIN * 2);
    const height = panelRef.current?.offsetHeight ?? 300;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );

    const below = rect.bottom + TRIGGER_GAP;
    const above = rect.top - TRIGGER_GAP - height;
    let top = below;

    if (below + height > window.innerHeight - VIEWPORT_MARGIN) {
      top = above >= VIEWPORT_MARGIN ? above : window.innerHeight - height - VIEWPORT_MARGIN;
    }

    setPosition({
      top: Math.max(top, VIEWPORT_MARGIN),
      left,
      width,
    });
  }, []);

  const show = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const tooltip =
    open && mounted
      ? createPortal(
          <div
            ref={panelRef}
            id={tooltipId}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="fixed z-[100] max-h-[70dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50"
          >
            <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
            <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {children}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={show}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white/70 text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-500 dark:hover:border-emerald-400/50 dark:hover:text-emerald-400",
          className,
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {tooltip}
    </>
  );
}
