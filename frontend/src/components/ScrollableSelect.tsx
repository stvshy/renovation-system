import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ChangeLikeEvent = { target: { value: string } };

type ScrollableSelectProps = {
  value: string;
  onChange: (event: ChangeLikeEvent) => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
};

type FlatOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  group?: string;
};

const flattenOptions = (children: React.ReactNode, group?: string): FlatOption[] => {
  const result: FlatOption[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<any>(child)) return;

    if (child.type === "option") {
      result.push({
        value: String(child.props.value ?? ""),
        label: child.props.children,
        disabled: Boolean(child.props.disabled),
        group,
      });
      return;
    }

    if (child.type === "optgroup") {
      const nextGroup = typeof child.props.label === "string" ? child.props.label : undefined;
      result.push(...flattenOptions(child.props.children, nextGroup));
    }
  });

  return result;
};

const ScrollableSelect: React.FC<ScrollableSelectProps> = ({ value, onChange, className = "", disabled = false, children, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ left: number; top: number; width: number; maxHeight: number }>({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 240,
  });
  const normalizedClassName = className.replace(/\bform-select\b/g, "").trim();

  const options = useMemo(() => flattenOptions(children), [children]);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) ?? options.find((opt) => !opt.disabled) ?? options[0];
  }, [options, value]);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const clickedInsideTrigger = Boolean(rootRef.current?.contains(targetNode));
      const clickedInsidePanel = Boolean(panelRef.current?.contains(targetNode));
      if (!clickedInsideTrigger && !clickedInsidePanel) {
        setIsOpen(false);
      }
    };

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePanelPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 8;
      const availableBelow = Math.max(120, window.innerHeight - rect.bottom - gap - viewportPadding);

      setPanelStyle({
        left: Math.max(viewportPadding, rect.left),
        top: rect.bottom + gap,
        width: rect.width,
        maxHeight: availableBelow,
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen]);

  const handleSelect = (nextValue: string) => {
    onChange({ target: { value: nextValue } });
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-11 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 bg-none px-3 pr-10 text-left text-slate-900 dark:text-slate-100 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed ${normalizedClassName}`}
      >
        <span className="block truncate">{selectedOption?.label ?? "-"}</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 dark:text-slate-300">
          <span className={`material-symbols-outlined text-[20px] transition-transform ${isOpen ? "rotate-180" : ""}`}>expand_more</span>
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
            style={{
              left: panelStyle.left,
              top: panelStyle.top,
              width: panelStyle.width,
            }}
          >
            <ul role="listbox" className="overflow-y-auto py-1" style={{ maxHeight: panelStyle.maxHeight }}>
              {options.map((option, index) => {
                const previous = options[index - 1];
                const showGroup = option.group && option.group !== previous?.group;
                const isSelected = option.value === selectedOption?.value;

                return (
                  <li key={`${option.group || "nogroup"}-${option.value}-${index}`} className="px-1">
                    {showGroup && <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{option.group}</div>}
                    <div
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        if (!option.disabled) handleSelect(option.value);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-primary text-white"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      } ${option.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span className="block truncate">{option.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ScrollableSelect;
