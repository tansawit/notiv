import type {
  SubmitDropdownControl,
  SubmitDropdownOption,
  SubmitLabelSearchControl
} from './base-combobox-control';
import type { NotivThemeMode, PanelPalette } from './toolbar-palette';
import { makeTextButton } from './toolbar-ui-utils';
import {
  FONT_STACK_MONO,
  FONT_STACK_SERIF,
  getPriorityAccentColor,
  getPriorityInactiveColor,
  getVisualModeTokens
} from '../shared/visual-tokens';

interface CreateToolbarSubmitPanelInput {
  panelPalette: PanelPalette;
  makePanelShell: (title: string) => HTMLDivElement;
  makeIconButton: (label: string, icon: HTMLElement) => HTMLButtonElement;
  onBackToQueue: () => void;
  getPanelPalette: () => PanelPalette;
  getColorMode: () => NotivThemeMode;
  getUserById: (userId: string) => { name?: string; avatarUrl?: string } | undefined;
  createSubmitDropdownControl: (config: {
    select: HTMLSelectElement;
    searchPlaceholder: string;
    getOptions: () => SubmitDropdownOption[];
  }) => SubmitDropdownControl;
  createSubmitLabelControl: () => SubmitLabelSearchControl;
}

export interface ToolbarSubmitPanelElements {
  submitPanel: HTMLDivElement;
  submitMeta: HTMLDivElement;
  submitTitleInput: HTMLInputElement;
  submitDescriptionInput: HTMLTextAreaElement;
  submitTeamSelect: HTMLSelectElement;
  submitPrioritySelect: HTMLSelectElement;
  submitProjectSelect: HTMLSelectElement;
  submitAssigneeSelect: HTMLSelectElement;
  submitTeamControl: SubmitDropdownControl;
  submitProjectControl: SubmitDropdownControl;
  submitPriorityControl: SubmitDropdownControl;
  submitAssigneeControl: SubmitDropdownControl;
  submitLabelControl: SubmitLabelSearchControl;
  submitTriageInput: HTMLInputElement;
  triageRow: HTMLLabelElement;
  submitLabelsWrap: HTMLDivElement;
  submitConfirmButton: HTMLButtonElement;
  closeTransientSubmitMenus: () => void;
}

function createBackChevronIcon(): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.style.display = 'inline-grid';
  icon.style.placeItems = 'center';
  icon.style.width = '14px';
  icon.style.height = '14px';
  icon.style.pointerEvents = 'none';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M15 18l-6-6 6-6');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('fill', 'none');
  svg.appendChild(path);
  icon.appendChild(svg);

  return icon;
}

export function createToolbarSubmitPanelElements(
  input: CreateToolbarSubmitPanelInput
): ToolbarSubmitPanelElements {
  const {
    panelPalette,
    makePanelShell,
    makeIconButton,
    onBackToQueue,
    getPanelPalette,
    getColorMode,
    getUserById,
    createSubmitDropdownControl,
    createSubmitLabelControl
  } = input;

  const submitPanel = makePanelShell('Create ticket');
  submitPanel.style.width = '332px';
  submitPanel.style.maxWidth = 'min(332px, calc(100vw - 20px))';

  const submitHeading = submitPanel.firstElementChild;
  if (submitHeading instanceof HTMLElement) {
    submitHeading.style.display = 'flex';
    submitHeading.style.alignItems = 'center';
    submitHeading.style.gap = '2px';
    submitHeading.style.marginBottom = '8px';
    submitHeading.style.marginLeft = '-6px';

    const submitBackIcon = createBackChevronIcon();
    const submitBackButton = document.createElement('button');
    submitBackButton.type = 'button';
    submitBackButton.title = 'Back to notes';
    submitBackButton.setAttribute('aria-label', 'Back to notes');
    submitBackButton.setAttribute('data-submit-back', 'true');
    submitBackButton.appendChild(submitBackIcon);
    submitBackButton.style.cssText = `
      all: unset !important;
      width: 24px !important;
      height: 24px !important;
      border: none !important;
      border-radius: 4px !important;
      background: transparent !important;
      color: ${panelPalette.textMuted} !important;
      cursor: pointer !important;
      display: inline-grid !important;
      place-items: center !important;
      box-shadow: none !important;
      outline: none !important;
      transition: background 120ms ease, color 120ms ease !important;
    `;
    submitBackButton.addEventListener('mouseenter', () => {
      submitBackButton.style.setProperty('background', panelPalette.surfaceHoverBackground, 'important');
      submitBackButton.style.setProperty('color', panelPalette.textPrimary, 'important');
    });
    submitBackButton.addEventListener('mouseleave', () => {
      submitBackButton.style.setProperty('background', 'transparent', 'important');
      submitBackButton.style.setProperty('color', panelPalette.textMuted, 'important');
    });
    submitBackButton.addEventListener('click', () => onBackToQueue());
    submitHeading.insertBefore(submitBackButton, submitHeading.firstChild);
  }

  const submitMeta = document.createElement('div');
  submitMeta.style.color = panelPalette.textSecondary;
  submitMeta.style.fontFamily = FONT_STACK_MONO;
  submitMeta.style.fontSize = '10px';
  submitMeta.style.lineHeight = '1.35';
  submitMeta.style.marginBottom = '4px';
  submitMeta.textContent = 'All notes submitted as one Linear ticket.';

  const submitTitleInput = document.createElement('input');
  submitTitleInput.type = 'text';
  submitTitleInput.placeholder = 'Ticket title';
  submitTitleInput.style.cssText = `
    width: 100% !important;
    height: 36px !important;
    border: none !important;
    border-bottom: 1px solid ${panelPalette.surfaceBorder} !important;
    border-radius: 0 !important;
    padding: 8px 0 !important;
    background: transparent !important;
    color: ${panelPalette.textPrimary} !important;
    font-family: ${FONT_STACK_SERIF} !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    outline: none !important;
    box-shadow: none !important;
    caret-color: ${panelPalette.textPrimary} !important;
  `;

  const submitDescriptionInput = document.createElement('textarea');
  submitDescriptionInput.placeholder = 'Description (optional)';
  submitDescriptionInput.style.cssText = `
    width: 100% !important;
    height: 72px !important;
    min-height: 72px !important;
    max-height: 120px !important;
    resize: none !important;
    border: none !important;
    border-bottom: 1px solid ${panelPalette.surfaceBorder} !important;
    border-radius: 0 !important;
    padding: 8px 0 !important;
    margin-top: 8px !important;
    background: transparent !important;
    color: ${panelPalette.textPrimary} !important;
    font-family: ${FONT_STACK_SERIF} !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
    outline: none !important;
    box-shadow: none !important;
    caret-color: ${panelPalette.textPrimary} !important;
  `;

  const syncSubmitFieldBorder = (field: HTMLInputElement | HTMLTextAreaElement, _focused: boolean): void => {
    field.style.boxShadow = 'none';
  };
  submitTitleInput.addEventListener('focus', () => syncSubmitFieldBorder(submitTitleInput, true));
  submitTitleInput.addEventListener('blur', () => syncSubmitFieldBorder(submitTitleInput, false));
  submitDescriptionInput.addEventListener('focus', () => syncSubmitFieldBorder(submitDescriptionInput, true));
  submitDescriptionInput.addEventListener('blur', () => syncSubmitFieldBorder(submitDescriptionInput, false));

  const makePropertyRow = (labelText: string, control: HTMLElement): HTMLDivElement => {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gap = '2px';
    row.style.padding = '4px 0';
    const label = document.createElement('span');
    label.textContent = labelText;
    label.style.fontSize = '11px';
    label.style.color = panelPalette.textMuted;
    label.style.fontFamily = FONT_STACK_MONO;
    label.style.textTransform = 'uppercase';
    label.style.letterSpacing = '0.04em';
    row.appendChild(label);
    row.appendChild(control);
    return row;
  };

  const submitTeamSelect = document.createElement('select');
  submitTeamSelect.style.display = 'none';

  const submitProjectSelect = document.createElement('select');
  submitProjectSelect.style.display = 'none';

  const submitPrioritySelect = document.createElement('select');
  submitPrioritySelect.style.display = 'none';
  [
    ['none', 'No priority'],
    ['4', 'Low'],
    ['3', 'Medium'],
    ['2', 'High'],
    ['1', 'Urgent']
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    submitPrioritySelect.appendChild(option);
  });

  const submitAssigneeSelect = document.createElement('select');
  submitAssigneeSelect.style.display = 'none';

  const getPriorityAccent = (value: string): string => {
    if (value === 'none') {
      return getPanelPalette().textMuted;
    }
    return getPriorityAccentColor(getColorMode(), value);
  };

  const createPriorityLead = (value: string): ((target: HTMLSpanElement) => void) => (target) => {
    target.textContent = '';
    target.style.display = 'inline-flex';
    target.style.alignItems = 'flex-end';
    target.style.gap = '2px';
    target.style.height = '14px';
    const filledCount = value === 'none' ? 0 : 5 - parseInt(value, 10);
    const activeColor = getPriorityAccent(value);
    const inactiveColor = getPriorityInactiveColor(getColorMode());
    for (let i = 0; i < 4; i++) {
      const bar = document.createElement('span');
      bar.style.width = '3px';
      bar.style.height = `${6 + i * 2}px`;
      bar.style.borderRadius = '1px';
      bar.style.background = i < filledCount ? activeColor : inactiveColor;
      target.appendChild(bar);
    }
  };

  const createAssigneeLead = (userId: string): ((target: HTMLSpanElement) => void) => (target) => {
    target.textContent = '';
    target.style.width = '16px';
    target.style.height = '16px';
    target.style.borderRadius = '50%';
    target.style.display = 'inline-flex';
    target.style.alignItems = 'center';
    target.style.justifyContent = 'center';
    target.style.flexShrink = '0';
    target.style.background = panelPalette.surfaceHoverBackground;
    target.style.fontSize = '10px';
    target.style.color = panelPalette.textMuted;
    const user = getUserById(userId);
    if (user?.avatarUrl) {
      target.style.background = `url(${user.avatarUrl}) center/cover`;
    } else if (user?.name) {
      target.textContent = user.name.charAt(0).toUpperCase();
    } else {
      target.textContent = '?';
    }
  };

  const submitTeamControl = createSubmitDropdownControl({
    select: submitTeamSelect,
    searchPlaceholder: 'Search teams...',
    getOptions: () => Array.from(submitTeamSelect.options).map((option) => ({
      value: option.value,
      label: option.textContent ?? '',
      keywords: option.textContent ?? ''
    }))
  });

  const submitProjectControl = createSubmitDropdownControl({
    select: submitProjectSelect,
    searchPlaceholder: 'Search projects...',
    getOptions: () => Array.from(submitProjectSelect.options).map((option) => ({
      value: option.value,
      label: option.textContent ?? '',
      keywords: option.textContent ?? ''
    }))
  });

  const submitPriorityControl = createSubmitDropdownControl({
    select: submitPrioritySelect,
    searchPlaceholder: 'Search priorities...',
    getOptions: () =>
      Array.from(submitPrioritySelect.options).map((option) => ({
        value: option.value,
        label: option.textContent ?? '',
        keywords: `${option.textContent ?? ''} ${option.value}`.trim(),
        labelColor: option.value === 'none' ? getPanelPalette().textMuted : getPriorityAccent(option.value),
        renderLead: createPriorityLead(option.value)
      }))
  });

  const submitAssigneeControl = createSubmitDropdownControl({
    select: submitAssigneeSelect,
    searchPlaceholder: 'Search assignees...',
    getOptions: () =>
      Array.from(submitAssigneeSelect.options).map((option) => ({
        value: option.value,
        label: option.textContent ?? '',
        keywords: option.textContent ?? '',
        renderLead: option.value
          ? createAssigneeLead(option.value)
          : (target) => {
            target.textContent = 'U';
            target.style.width = '16px';
            target.style.height = '16px';
            target.style.borderRadius = '50%';
            target.style.display = 'inline-flex';
            target.style.alignItems = 'center';
            target.style.justifyContent = 'center';
            target.style.flexShrink = '0';
            target.style.background = panelPalette.surfaceHoverBackground;
            target.style.fontSize = '10px';
            target.style.color = panelPalette.textMuted;
          }
      }))
  });

  const submitTriageInput = document.createElement('input');
  submitTriageInput.type = 'checkbox';
  submitTriageInput.checked = false;
  submitTriageInput.style.accentColor = getVisualModeTokens(getColorMode()).triageAccent;
  submitTriageInput.style.width = '14px';
  submitTriageInput.style.height = '14px';

  const triageRow = document.createElement('label');
  triageRow.style.display = 'flex';
  triageRow.style.alignItems = 'center';
  triageRow.style.justifyContent = 'space-between';
  triageRow.style.gap = '8px';
  triageRow.style.padding = '4px 0';
  triageRow.style.cursor = 'pointer';
  const triageText = document.createElement('span');
  triageText.textContent = 'Triage';
  triageText.style.fontSize = '12px';
  triageText.style.color = panelPalette.textSecondary;
  triageText.style.fontFamily = FONT_STACK_MONO;
  triageRow.appendChild(triageText);
  triageRow.appendChild(submitTriageInput);

  const submitLabelsWrap = document.createElement('div');
  submitLabelsWrap.style.display = 'contents';

  const submitLabelControl = createSubmitLabelControl();
  submitLabelControl.container.style.width = 'auto';

  const labelSection = document.createElement('div');
  labelSection.style.display = 'grid';
  labelSection.style.gap = '4px';
  labelSection.style.paddingTop = '4px';
  labelSection.style.marginTop = '4px';

  const labelTitle = document.createElement('span');
  labelTitle.textContent = 'Labels';
  labelTitle.style.fontSize = '11px';
  labelTitle.style.color = panelPalette.textMuted;
  labelTitle.style.fontFamily = FONT_STACK_MONO;
  labelTitle.style.textTransform = 'uppercase';
  labelTitle.style.letterSpacing = '0.04em';

  const labelControls = document.createElement('div');
  labelControls.style.display = 'flex';
  labelControls.style.flexWrap = 'wrap';
  labelControls.style.alignItems = 'center';
  labelControls.style.justifyContent = 'flex-start';
  labelControls.style.gap = '6px';
  labelControls.style.minHeight = '32px';
  labelControls.appendChild(submitLabelsWrap);
  labelControls.appendChild(submitLabelControl.container);

  labelSection.appendChild(labelTitle);
  labelSection.appendChild(labelControls);

  const submitConfirmButton = makeTextButton('Create ticket');
  submitConfirmButton.style.width = '100%';
  submitConfirmButton.style.marginTop = '12px';
  submitConfirmButton.style.padding = '10px 12px';
  submitConfirmButton.style.fontSize = '13px';
  submitConfirmButton.style.fontWeight = '550';
  submitConfirmButton.style.border = `1.25px solid ${panelPalette.textMuted}`;
  submitConfirmButton.style.background = 'transparent';
  submitConfirmButton.style.color = panelPalette.textPrimary;

  const submitFields = document.createElement('div');
  submitFields.style.display = 'grid';
  submitFields.style.gap = '0';

  const propertiesSection = document.createElement('div');
  propertiesSection.style.paddingTop = '4px';
  propertiesSection.style.marginTop = '8px';

  submitFields.appendChild(submitMeta);
  submitFields.appendChild(submitTitleInput);
  submitFields.appendChild(submitDescriptionInput);
  propertiesSection.appendChild(makePropertyRow('Team', submitTeamControl.container));
  propertiesSection.appendChild(makePropertyRow('Project', submitProjectControl.container));
  propertiesSection.appendChild(makePropertyRow('Priority', submitPriorityControl.container));
  propertiesSection.appendChild(makePropertyRow('Assignee', submitAssigneeControl.container));
  propertiesSection.appendChild(triageRow);
  submitFields.appendChild(propertiesSection);
  submitFields.appendChild(labelSection);

  submitPanel.appendChild(submitFields);
  submitPanel.appendChild(submitConfirmButton);

  const closeTransientSubmitMenus = (): void => {
    submitTeamControl.close();
    submitProjectControl.close();
    submitPriorityControl.close();
    submitAssigneeControl.close();
    submitLabelControl.close();
  };

  return {
    submitPanel,
    submitMeta,
    submitTitleInput,
    submitDescriptionInput,
    submitTeamSelect,
    submitPrioritySelect,
    submitProjectSelect,
    submitAssigneeSelect,
    submitTeamControl,
    submitProjectControl,
    submitPriorityControl,
    submitAssigneeControl,
    submitLabelControl,
    submitTriageInput,
    triageRow,
    submitLabelsWrap,
    submitConfirmButton,
    closeTransientSubmitMenus
  };
}
