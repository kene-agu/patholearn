"use client";

import { useState, useRef, useEffect, type ReactNode, type KeyboardEvent } from "react";
import { clsx } from "clsx";

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
  /** Small uppercase label above the list, e.g. "Suggestions". */
  heading?: string;
  /** Icon rendered inside the input on the left (input needs left padding). */
  leading?: ReactNode;
  /** Node rendered after the input (e.g. a send button). */
  trailing?: ReactNode;
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

/**
 * Lightweight searchable autocomplete (combobox). Headless-ish: the parent owns
 * the value and supplies suggestions; this handles the dropdown, keyboard
 * navigation (↑/↓/Enter/Esc), highlighting and outside-click-to-close.
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
  openOnFocus = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = getSuggestions(value).slice(0, maxItems);
  const showDropdown = open && suggestions.length > 0;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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

      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1"
        >
          {heading && (
            <li className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
              {heading}
            </li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              className={clsx(
                "px-3 py-2 cursor-pointer",
                i === active ? "bg-primary-50 dark:bg-primary-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-700/50",
              )}
            >
              <span className="block text-sm text-slate-700 dark:text-slate-200 leading-snug">
                {highlight(s.label, value)}
              </span>
              {s.sublabel && <span className="block text-[11px] text-slate-400 mt-0.5">{s.sublabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
