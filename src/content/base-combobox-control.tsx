import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Combobox } from '@base-ui/react/combobox';
import { FONT_STACK_MONO, UTILITY_STYLE_TOKENS } from '../shared/visual-tokens';

export interface SubmitDropdownOption {
  value: string;
  label: string;
  keywords?: string;
  disabled?: boolean;
  labelColor?: string;
  renderLead?: (target: HTMLSpanElement, context: 'trigger' | 'option') => void;
}

interface SubmitDropdownPalette {
  inputBorder: string;
  inputBackground: string;
  inputText: string;
  surfaceBorder: string;
  shellBackground: string;
  surfaceHoverShadow: string;
  surfaceHoverBackground: string;
  surfaceSelectedBackground: string;
  textPrimary: string;
  textMuted: string;
}

export interface SubmitDropdownControl {
  container: HTMLDivElement;
  trigger: HTMLButtonElement;
  menu: HTMLDivElement;
  searchInput: HTMLInputElement;
  close: () => void;
  refresh: () => void;
  syncTheme: () => void;
  syncDisabled: () => void;
  contains: (target: Node) => boolean;
  destroy?: () => void;
}

export interface SubmitLabelSearchOption {
  value: string;
  label: string;
  keywords?: string;
  color?: string;
  checked?: boolean;
}

export interface SubmitLabelSearchControl {
  container: HTMLDivElement;
  menu: HTMLDivElement;
  searchInput: HTMLInputElement;
  close: () => void;
  refresh: () => void;
  syncTheme: () => void;
  syncDisabled: () => void;
  contains: (target: Node) => boolean;
  destroy?: () => void;
}

function ensureComboboxStyles(): void {
  if (document.getElementById('notiv-base-combobox-style')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'notiv-base-combobox-style';
  style.textContent = `
    .notiv-base-combobox-item[data-highlighted] {
      background: var(--notiv-combobox-hover-bg, ${UTILITY_STYLE_TOKENS.combobox.hoverBackgroundFallback}) !important;
    }
    .notiv-base-combobox-item:hover {
      background: var(--notiv-combobox-hover-bg, ${UTILITY_STYLE_TOKENS.combobox.hoverBackgroundFallback}) !important;
    }
    .notiv-base-combobox-item[data-selected] {
      background: var(--notiv-combobox-selected-bg, ${UTILITY_STYLE_TOKENS.combobox.selectedBackgroundFallback});
    }
    .notiv-base-combobox-item[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
  document.head.appendChild(style);
}

function renderIconCheck(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m20 6-11 11-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LeadSlot({
  renderer,
  context
}: {
  renderer?: (target: HTMLSpanElement, context: 'trigger' | 'option') => void;
  context: 'trigger' | 'option';
}): React.JSX.Element {
  const ref = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    node.textContent = '';
    node.style.width = '';
    node.style.height = '';
    node.style.marginRight = '';
    if (renderer) {
      renderer(node, context);
    }
  }, [renderer, context]);
  return <span ref={ref} style={{ flexShrink: 0 }} />;
}

interface BaseComboboxProps {
  options: SubmitDropdownOption[];
  value: string;
  disabled: boolean;
  searchPlaceholder: string;
  palette: SubmitDropdownPalette;
  portalContainer: HTMLDivElement;
  onBeforeOpen?: () => void;
  onSelect: (value: string) => void;
  registerParts: (parts: {
    trigger: HTMLButtonElement | null;
    searchInput: HTMLInputElement | null;
  }) => void;
}

function BaseCombobox({
  options,
  value,
  disabled,
  searchPlaceholder,
  palette,
  portalContainer,
  onBeforeOpen,
  onSelect,
  registerParts
}: BaseComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState(220);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value]
  );

  useEffect(() => {
    registerParts({ trigger: triggerRef.current, searchInput: inputRef.current });
  }, [registerParts, open, options, value]);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const update = (): void => {
      const width = Math.max(220, Math.round(trigger.getBoundingClientRect().width + 44));
      setTriggerWidth(width);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open]);

  const selectedLabel = selected?.label ?? 'None';
  const selectedLabelColor = selected?.labelColor ?? palette.inputText;

  return (
    <Combobox.Root<SubmitDropdownOption>
      items={options}
      value={selected ?? null}
      disabled={disabled}
      open={open}
      autoHighlight
      highlightItemOnHover
      filter={(item, query) => {
        if (!item) {
          return false;
        }
        const haystack = `${item.label} ${item.keywords ?? ''}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      }}
      itemToStringLabel={(item) => (item ? item.label : '')}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onBeforeOpen?.();
        }
        setOpen(nextOpen);
      }}
      onValueChange={(item) => {
        if (!item || item.disabled) {
          return;
        }
        onSelect(item.value);
        setOpen(false);
      }}
    >
      <Combobox.Trigger
        ref={triggerRef}
        data-notiv-ui="true"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        style={{
          width: '100%',
          height: '36px',
          padding: '0 28px 0 8px',
          borderRadius: '6px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '8px',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: FONT_STACK_MONO,
          fontSize: '12px',
          border: `1.25px solid ${palette.inputBorder}`,
          background: palette.inputBackground,
          color: palette.inputText,
          opacity: disabled ? 0.6 : 1
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            minWidth: 0
          }}
        >
          {selected?.renderLead ? <LeadSlot renderer={selected.renderLead} context="trigger" /> : null}
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'left',
              color: selectedLabelColor
            }}
          >
            {selectedLabel}
          </span>
        </span>
        <span
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'inline-grid',
            placeItems: 'center',
            width: '12px',
            height: '12px',
            opacity: 0.85
          }}
          aria-hidden="true"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </Combobox.Trigger>

      <Combobox.Portal container={portalContainer}>
        <Combobox.Positioner
          data-notiv-ui="true"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          style={{ zIndex: 2147483647 }}
        >
          <Combobox.Popup
            data-notiv-ui="true"
            style={{
              width: `${triggerWidth}px`,
              maxHeight: '240px',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr)',
              padding: '6px 6px 4px 6px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: `1.25px solid ${palette.surfaceBorder}`,
              background: palette.shellBackground,
              boxShadow: palette.surfaceHoverShadow,
              ['--notiv-combobox-hover-bg' as string]: palette.surfaceHoverBackground,
              ['--notiv-combobox-selected-bg' as string]: palette.surfaceSelectedBackground
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Combobox.Input
              ref={inputRef}
              data-notiv-ui="true"
              placeholder={searchPlaceholder}
              onPointerDown={(event) => event.stopPropagation()}
              style={{
                width: '100%',
                height: '30px',
                padding: '0 9px',
                borderRadius: '7px',
                fontFamily: FONT_STACK_MONO,
                fontSize: '11px',
                marginBottom: '5px',
                outline: 'none',
                border: `1.25px solid ${palette.surfaceBorder}`,
                background: palette.inputBackground,
                color: palette.inputText
              }}
              autoComplete="off"
            />
            <Combobox.List
              data-notiv-ui="true"
              style={{
                overflowY: 'auto',
                minHeight: 0,
                display: 'grid',
                gap: '2px'
              }}
            >
              {(item: SubmitDropdownOption) => (
                <Combobox.Item
                  key={item.value}
                  className="notiv-base-combobox-item"
                  data-notiv-ui="true"
                  value={item}
                  disabled={item.disabled}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 8px',
                    border: 'none',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: palette.textPrimary,
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    fontFamily: FONT_STACK_MONO,
                    fontSize: '12px'
                  }}
                >
                  {item.renderLead ? <LeadSlot renderer={item.renderLead} context="option" /> : <span />}
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      color: item.labelColor ?? palette.textPrimary
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      opacity: item.value === value ? 1 : 0,
                      color: palette.textMuted,
                      display: 'inline-grid',
                      placeItems: 'center'
                    }}
                  >
                    {renderIconCheck()}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
            <Combobox.Empty
              style={{
                padding: '7px 9px',
                fontFamily: FONT_STACK_MONO,
                fontSize: '11px',
                color: palette.textMuted
              }}
            >
              No matching options
            </Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

interface BaseLabelSearchComboboxProps {
  options: SubmitLabelSearchOption[];
  disabled: boolean;
  searchPlaceholder: string;
  palette: SubmitDropdownPalette;
  portalContainer: HTMLDivElement;
  onBeforeOpen?: () => void;
  onSelect: (value: string) => void;
  registerParts: (parts: {
    searchInput: HTMLInputElement | null;
  }) => void;
}

function BaseLabelSearchCombobox({
  options,
  disabled,
  searchPlaceholder,
  palette,
  portalContainer,
  onBeforeOpen,
  onSelect,
  registerParts
}: BaseLabelSearchComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [menuWidth, setMenuWidth] = useState(240);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const allowCloseRef = useRef(false);
  const selectedCount = useMemo(
    () => options.filter((option) => option.checked).length,
    [options]
  );
  const compactTrigger = selectedCount > 0;

  useEffect(() => {
    registerParts({ searchInput: inputRef.current });
  }, [registerParts, open, options, disabled]);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const update = (): void => {
      const width = Math.max(240, Math.round(trigger.getBoundingClientRect().width + 44));
      setMenuWidth(width);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);

  const requestClose = (): void => {
    allowCloseRef.current = true;
    setOpen(false);
  };

  const toggleOpenIfAllowed = (): void => {
    if (disabled) {
      return;
    }
    if (open) {
      requestClose();
      return;
    }
    onBeforeOpen?.();
    setOpen(true);
  };

  const handleTriggerPointerDown = (event: React.PointerEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    event.preventDefault();
    toggleOpenIfAllowed();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    toggleOpenIfAllowed();
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open]);

  return (
    <Combobox.Root<SubmitLabelSearchOption>
      items={options}
      value={null}
      disabled={disabled}
      open={open}
      autoHighlight
      highlightItemOnHover
      filter={(item, query) => {
        if (!item) {
          return false;
        }
        const haystack = `${item.label} ${item.keywords ?? ''}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      }}
      itemToStringLabel={(item) => (item ? item.label : '')}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (!allowCloseRef.current) {
            return;
          }
          allowCloseRef.current = false;
          setOpen(false);
        }
      }}
      onValueChange={(item) => {
        if (!item || item.value.trim().length === 0) {
          return;
        }
        onSelect(item.value);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }}
    >
      <Combobox.Trigger
        ref={triggerRef}
        data-notiv-ui="true"
        onPointerDown={handleTriggerPointerDown}
        onKeyDown={handleTriggerKeyDown}
        aria-label="Add label"
        title="Add label"
        style={{
          width: compactTrigger ? '32px' : 'fit-content',
          maxWidth: '100%',
          minWidth: compactTrigger ? '32px' : '116px',
          height: '32px',
          padding: compactTrigger ? '0' : '0 12px 0 10px',
          borderRadius: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compactTrigger ? '0' : '7px',
          fontFamily: FONT_STACK_MONO,
          fontSize: '12px',
          lineHeight: '1',
          textAlign: 'left',
          outline: 'none',
          border: `1.25px solid ${palette.inputBorder}`,
          background: palette.inputBackground,
          color: palette.inputText,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: '13px',
            height: '13px',
            display: 'inline-grid',
            placeItems: 'center',
            color: palette.textMuted
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {!compactTrigger ? <span>Add label</span> : null}
      </Combobox.Trigger>

      <Combobox.Portal container={portalContainer}>
        <Combobox.Positioner
          data-notiv-ui="true"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          style={{ zIndex: 2147483647 }}
        >
          <Combobox.Popup
            data-notiv-ui="true"
            style={{
              width: `${menuWidth}px`,
              maxHeight: '240px',
              display: 'grid',
              gridTemplateRows: 'auto minmax(0, 1fr)',
              padding: '6px 6px 4px 6px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: `1.25px solid ${palette.surfaceBorder}`,
              background: palette.shellBackground,
              boxShadow: palette.surfaceHoverShadow,
              ['--notiv-combobox-hover-bg' as string]: palette.surfaceHoverBackground,
              ['--notiv-combobox-selected-bg' as string]: palette.surfaceSelectedBackground
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Combobox.Input
              ref={inputRef}
              data-notiv-ui="true"
              placeholder={searchPlaceholder}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                requestClose();
              }}
              style={{
                width: '100%',
                height: '30px',
                padding: '0 9px',
                borderRadius: '7px',
                fontFamily: FONT_STACK_MONO,
                fontSize: '11px',
                marginBottom: '5px',
                outline: 'none',
                border: `1.25px solid ${palette.surfaceBorder}`,
                background: palette.inputBackground,
                color: palette.inputText
              }}
              autoComplete="off"
            />
            <Combobox.List
              data-notiv-ui="true"
              style={{
                overflowY: 'auto',
                minHeight: 0,
                display: 'grid',
                gap: '2px'
              }}
            >
              {(item: SubmitLabelSearchOption) => (
                <Combobox.Item
                  key={item.value}
                  className="notiv-base-combobox-item"
                  data-notiv-ui="true"
                  value={item}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 8px',
                    border: 'none',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: palette.textPrimary,
                    cursor: 'pointer',
                    fontFamily: FONT_STACK_MONO,
                    fontSize: '12px'
                  }}
                >
                  <span
                    style={{
                      width: '13px',
                      height: '13px',
                      borderRadius: '3px',
                      border: `1.25px solid ${item.checked ? palette.textPrimary : palette.surfaceBorder}`,
                      background: item.checked ? palette.textPrimary : 'transparent',
                      color: item.checked ? palette.shellBackground : 'transparent',
                      flexShrink: 0,
                      display: 'inline-grid',
                      placeItems: 'center'
                    }}
                    aria-hidden="true"
                  >
                    {item.checked ? renderIconCheck() : null}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      color: palette.textPrimary
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: item.color || palette.textMuted,
                      flexShrink: 0
                    }}
                    aria-hidden="true"
                  />
                </Combobox.Item>
              )}
            </Combobox.List>
            <Combobox.Empty
              style={{
                padding: '7px 9px',
                fontFamily: FONT_STACK_MONO,
                fontSize: '11px',
                color: palette.textMuted
              }}
            >
              No matching labels
            </Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

export function createBaseSubmitDropdownControl(config: {
  select: HTMLSelectElement;
  searchPlaceholder: string;
  getOptions: () => SubmitDropdownOption[];
  getPalette: () => SubmitDropdownPalette;
  onBeforeOpen?: () => void;
}): SubmitDropdownControl {
  ensureComboboxStyles();
  const { select, searchPlaceholder, getOptions, getPalette, onBeforeOpen } = config;
  select.style.display = 'none';

  const container = document.createElement('div');
  container.setAttribute('data-notiv-ui', 'true');
  container.style.position = 'relative';
  container.style.width = '172px';

  const portalHost = document.createElement('div');
  portalHost.setAttribute('data-notiv-ui', 'true');
  portalHost.style.position = 'fixed';
  portalHost.style.left = '0';
  portalHost.style.top = '0';
  portalHost.style.width = '0';
  portalHost.style.height = '0';
  portalHost.style.zIndex = '2147483647';
  document.documentElement.appendChild(portalHost);

  let reactRoot: Root | null = createRoot(container);
  let closeSignal = 0;
  const control: SubmitDropdownControl = {
    container,
    trigger: document.createElement('button'),
    menu: portalHost,
    searchInput: document.createElement('input'),
    close: () => {
      closeSignal += 1;
      render();
    },
    refresh: () => {
      render();
    },
    syncTheme: () => {
      render();
    },
    syncDisabled: () => {
      if (select.disabled) {
        closeSignal += 1;
      }
      render();
    },
    contains: (target: Node) => container.contains(target) || portalHost.contains(target),
    destroy: () => {
      select.removeEventListener('change', handleSelectChange);
      reactRoot?.unmount();
      reactRoot = null;
      portalHost.remove();
    }
  };

  const selectValue = (value: string): void => {
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    render();
  };

  const render = (): void => {
    if (!reactRoot) {
      return;
    }
    let options = getOptions();
    if (options.length > 0 && !options.some((option) => option.value === select.value)) {
      select.value = options[0].value;
    }
    options = getOptions();
    reactRoot.render(
      <BaseCombobox
        key={closeSignal}
        options={options}
        value={select.value}
        disabled={select.disabled}
        searchPlaceholder={searchPlaceholder}
        palette={getPalette()}
        portalContainer={portalHost}
        onBeforeOpen={onBeforeOpen}
        onSelect={selectValue}
        registerParts={({ trigger, searchInput }) => {
          if (trigger) {
            control.trigger = trigger;
          }
          if (searchInput) {
            control.searchInput = searchInput;
          }
        }}
      />
    );
  };

  const handleSelectChange = (): void => {
    render();
  };
  select.addEventListener('change', handleSelectChange);
  render();
  return control;
}

export function createBaseLabelSearchControl(config: {
  searchPlaceholder: string;
  getOptions: () => SubmitLabelSearchOption[];
  getPalette: () => SubmitDropdownPalette;
  isDisabled: () => boolean;
  onSelect: (value: string) => void;
  onBeforeOpen?: () => void;
}): SubmitLabelSearchControl {
  ensureComboboxStyles();
  const { searchPlaceholder, getOptions, getPalette, isDisabled, onSelect, onBeforeOpen } = config;

  const container = document.createElement('div');
  container.setAttribute('data-notiv-ui', 'true');
  container.style.position = 'relative';
  container.style.width = '100%';

  const portalHost = document.createElement('div');
  portalHost.setAttribute('data-notiv-ui', 'true');
  portalHost.style.position = 'fixed';
  portalHost.style.left = '0';
  portalHost.style.top = '0';
  portalHost.style.width = '0';
  portalHost.style.height = '0';
  portalHost.style.zIndex = '2147483647';
  document.documentElement.appendChild(portalHost);

  let reactRoot: Root | null = createRoot(container);
  let closeSignal = 0;

  const control: SubmitLabelSearchControl = {
    container,
    menu: portalHost,
    searchInput: document.createElement('input'),
    close: () => {
      closeSignal += 1;
      render();
    },
    refresh: () => {
      render();
    },
    syncTheme: () => {
      render();
    },
    syncDisabled: () => {
      if (isDisabled()) {
        closeSignal += 1;
      }
      render();
    },
    contains: (target: Node) => container.contains(target) || portalHost.contains(target),
    destroy: () => {
      reactRoot?.unmount();
      reactRoot = null;
      portalHost.remove();
    }
  };

  const render = (): void => {
    if (!reactRoot) {
      return;
    }
    const options = getOptions();
    reactRoot.render(
      <BaseLabelSearchCombobox
        key={closeSignal}
        options={options}
        disabled={isDisabled()}
        searchPlaceholder={searchPlaceholder}
        palette={getPalette()}
        portalContainer={portalHost}
        onBeforeOpen={onBeforeOpen}
        onSelect={(value) => {
          onSelect(value);
          render();
        }}
        registerParts={({ searchInput }) => {
          if (searchInput) {
            control.searchInput = searchInput;
          }
        }}
      />
    );
  };

  render();
  return control;
}
