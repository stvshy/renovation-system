import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ChangeLikeEvent = { target: { value: string } };

const extractTextFromNode = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join("");
  if (React.isValidElement<any>(node)) return extractTextFromNode(node.props.children);
  return "";
};

const getFontShorthand = (el: HTMLElement) => {
  const s = window.getComputedStyle(el);
  // `font` can be empty depending on browser; build a reasonable shorthand fallback.
  return (
    s.font ||
    `${s.fontStyle} ${s.fontVariant} ${s.fontWeight} ${s.fontSize}/${s.lineHeight} ${s.fontFamily}`.replace(/\s+/g, " ").trim()
  );
};

type ScrollableSelectProps = {
  value: string;
  onChange: (event: ChangeLikeEvent) => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
  placeholder?: string;
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

const ScrollableSelect: React.FC<ScrollableSelectProps> = ({
  value,
  onChange,
  className = "",
  disabled = false,
  children,
  ariaLabel,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ left: number; top: number; width: number; maxHeight: number; maxPanelWidth?: number }>({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 240,
  });
  const normalizedClassName = className.replace(/\bform-select\b/g, "").trim();

  const options = useMemo(() => flattenOptions(children), [children]);

  const hasPlaceholderState = Boolean(placeholder) && value === "";

  const selectedOption = useMemo(() => {
    if (hasPlaceholderState) return undefined;
    return options.find((opt) => opt.value === value) ?? options.find((opt) => !opt.disabled) ?? options[0];
  }, [hasPlaceholderState, options, value]);

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

      const maxPanelWidth = window.innerWidth - 2 * viewportPadding;
      const isMobile = window.innerWidth < 640;

      let shouldExpandToViewport = false;
      if (isMobile) {
        // Measure the widest option label (plus optgroup labels) and decide if it fits the trigger width.
        // If it doesn't fit, expand the panel to viewport width (prevents horizontal overflow on mobile).
        const font = getFontShorthand(trigger);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.font = font;

          const optionTexts = options.map((o) => extractTextFromNode(o.label));
          const groupTexts = Array.from(new Set(options.map((o) => o.group).filter(Boolean) as string[]));
          const candidates = [...optionTexts, ...groupTexts].map((s) => (s ?? "").trim()).filter(Boolean);

          const widest = candidates.reduce((max, text) => Math.max(max, ctx.measureText(text).width), 0);
          // Approximate paddings & chevron; keep conservative to avoid edge overflow.
          const horizontalChrome = 16 /* list item px-3 */ * 2 + 24 /* breathing room */;
          shouldExpandToViewport = widest + horizontalChrome > rect.width;
        }
      }
      setPanelStyle({
        left: isMobile && shouldExpandToViewport ? viewportPadding : Math.max(viewportPadding, rect.left),
        top: rect.bottom + gap,
        width: isMobile && shouldExpandToViewport ? maxPanelWidth : rect.width,
        maxHeight: availableBelow,
        maxPanelWidth,
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

  const displayLabel = hasPlaceholderState ? placeholder : selectedOption?.label ?? "-";

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
        className={`w-full min-h-11 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 bg-none px-3 pr-10 text-left text-slate-900 dark:text-slate-100 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed ${
          hasPlaceholderState ? "!text-slate-400 dark:!text-slate-500" : ""        } ${normalizedClassName}`}
      >
        <span className="block truncate">{displayLabel}</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 dark:text-slate-300">
          <span className={`material-symbols-outlined text-[20px] transition-transform ${isOpen ? "rotate-180" : ""}`}>expand_more</span>
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
            style={{
              left: panelStyle.left,
              top: panelStyle.top,
              width: panelStyle.width,
              maxWidth: panelStyle.maxPanelWidth ?? undefined,
            }}
          >
            <ul role="listbox" className="overflow-y-auto py-1" style={{ maxHeight: panelStyle.maxHeight }}>
              {options.map((option, index) => {
                const previous = options[index - 1];
                const showGroup = option.group && option.group !== previous?.group;
                const isSelected = option.value === selectedOption?.value;

                return (
                  <li key={`${option.group || "nogroup"}-${option.value}-${index}`} className="px-1">
                    {showGroup && <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 truncate">{option.group}</div>}
                    <div
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        if (!option.disabled) handleSelect(option.value);
                      }}
                      className={`w-full min-w-0 rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
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
