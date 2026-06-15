"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { Sparkles } from "lucide-react";

export interface Suggestion {
  id: string;
  label: string;
  /** Optional secondary line (e.g. organ system). */
  sublabel?: string;
}

interface ComboboxProps {
  value: string;
  onChange: (v: string) => void;
  /** Fired when a suggestion is chosen (click, or Enter on the highlighted row). */
  onSelect: (s: Suggestion) => void;
  /** Fired when Enter is pressed with no row highlighted (free-text submit). */
  onSubmit?: (v: string) => void;
  /** Compute the suggestion list for the current query (return defaults for ""). */
  getSuggestions: (query: string) => Suggestion[];
  placeholder?: string;
  disabled?: boolean;
  /** Classes for the <input> itself. */
  inputClassName?: string;
  /** Cap on rows shown. Default 7. */
  maxItems?: number;
  /** Small label above the list, e.g. "Suggestions". */
  heading?: string;
  /** Icon rendered inside the input on the left (input needs left padding). */
  leading?: ReactNode;
  /** Node rendered after the input (e.g. a send button). */
  trailing?: ReactNode;
  /** Icon shown at the start of every suggestion row. Defaults to a sparkle. */
  itemIcon?: ReactNode;
  /** Show suggestions as soon as the (possibly empty) input is focused. Default true. */
  openOnFocus?: boolean;
}

function highlight(label: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return label;
  const idx = label.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-transparent text-primary-600 dark:text-primary-300 font-semibold">
        {label.slice(idx, idx + q.length)}
      </mark>
      {label.slice(idx + q.length)}
    </>
  );
}

interface Coords { left: number; width: number; top: number; openUp: boolean }

const ROW_PX = 52;     // approx height of one suggestion row
const CHROME_PX = 44;  // heading + padding

/**
 * Searchable autocomplete (combobox) with ChatGPT-style floating suggestions.
 *
 * The dropdown is rendered in a portal with fixed positioning so it is never
 * clipped by an ancestor's `overflow-hidden`, and it auto-flips upward when the
 * input sits near the bottom of the viewport. Keyboard: ↑/↓/Enter/Esc.
 */
export default function Combobox({
  value,
  onChange,
  onSelect,
  onSubmit,
  getSuggestions,
  placeholder,
  disabled,
  inputClassName,
  maxItems = 7,
  heading,
  leading,
  trailing,
  itemIcon,
  openOnFocus = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const suggestions = getSuggestions(value).slice(0, maxItems);
  const showDropdown = open && suggestions.length > 0;

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback((count: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const estHeight = Math.min(count * ROW_PX + CHROME_PX, 360);
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < estHeight + 16 && r.top > spaceBelow;
    setCoords({ left: r.left, width: r.width, top: openUp ? r.top : r.bottom, openUp });
  }, []);

  // Reposition whenever the dropdown is shown or the query/options change.
  useEffect(() => {
    if (showDropdown) updatePosition(suggestions.length);
  }, [showDropdown, value, suggestions.length, updatePosition]);

  // Keep it anchored while scrolling/resizing.
  useEffect(() => {
    if (!showDropdown) return;
    const handler = () => updatePosition(suggestions.length);
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [showDropdown, suggestions.length, updatePosition]);

  // Close on outside click (accounting for the portalled dropdown).
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const choose = (s: Suggestion) => {
    onSelect(s);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (showDropdown && active >= 0 && active < suggestions.length) {
        e.preventDefault();
        choose(suggestions[active]);
      } else {
        onSubmit?.(value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const dropdown = mounted && showDropdown && coords
    ? createPortal(
        <div
          ref={dropRef}
          role="listbox"
          style={{
            position: "fixed",
            left: coords.left,
            width: coords.width,
            ...(coords.openUp
              ? { bottom: window.innerHeight - coords.top + 8 }
              : { top: coords.top + 8 }),
            zIndex: 1000,
          }}
          className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black/5 p-1.5"
        >
          {heading && (
            <div className="px-3 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 select-none">
              {heading}
            </div>
          )}
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              className={clsx(
                "px-3 py-2.5 rounded-xl cursor-pointer flex items-start gap-2.5 transition-colors",
                i === active
                  ? "bg-primary-50 dark:bg-primary-900/40"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/50",
              )}
            >
              <span className={clsx("mt-0.5 flex-shrink-0", i === active ? "text-primary-500" : "text-slate-300 dark:text-slate-500")}>
                {itemIcon ?? <Sparkles className="w-4 h-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-slate-700 dark:text-slate-100 leading-snug">
                  {highlight(s.label, value)}
                </span>
                {s.sublabel && <span className="block text-[11px] text-slate-400 mt-0.5">{s.sublabel}</span>}
              </span>
            </div>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative flex items-center gap-2">
        {leading && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-slate-400">
            {leading}
          </span>
        )}
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={clsx("flex-1", inputClassName)}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => { if (openOnFocus || value) setOpen(true); }}
          onKeyDown={onKeyDown}
        />
        {trailing}
      </div>
      {dropdown}
    </div>
  );
}
