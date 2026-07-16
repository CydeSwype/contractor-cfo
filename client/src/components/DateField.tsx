import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { Calendar, X } from 'lucide-react';
import 'react-day-picker/style.css';

interface DateFieldProps {
  /** Date value as an ISO string or "YYYY-MM-DD". Null/empty means no date. */
  value: string | null | undefined;
  /** Called with a "YYYY-MM-DD" string, or null when cleared. */
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Show a clear (×) button when a date is set. */
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}

// Parse a stored value into a local Date, ignoring any time/zone component so the
// calendar highlights the same calendar day the user picked.
function parseValue(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

// Emit a timezone-stable "YYYY-MM-DD" string from the picked local date.
function formatOut(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DateField({
  value,
  onChange,
  placeholder = 'Select date',
  clearable = false,
  disabled = false,
  className = '',
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = parseValue(value);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 bg-canvas border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand disabled:opacity-50"
      >
        <span className={selected ? 'text-fg' : 'text-fg-muted'}>
          {selected ? selected.toLocaleDateString() : placeholder}
        </span>
        <span className="flex items-center gap-1 text-fg-muted">
          {clearable && selected && (
            <X
              size={14}
              className="hover:text-fg"
              onClick={e => {
                e.stopPropagation();
                onChange(null);
                setOpen(false);
              }}
            />
          )}
          <Calendar size={14} />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-surface border border-border rounded-xl p-2 shadow-xl">
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={d => {
              if (d) {
                onChange(formatOut(d));
                setOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
