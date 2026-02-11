import { ChevronLeft } from 'lucide';
import type {
  SubmitDropdownControl,
  SubmitDropdownOption,
  SubmitLabelSearchControl
} from './base-combobox-control';
import type { NotivThemeMode, PanelPalette } from './toolbar-palette';
import { createIcon, makeTextButton } from './toolbar-ui-utils';
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
    submitHeading.style.gap = '6px';
    submitHeading.style.marginBottom = '8px';

    const submitBackIcon = createIcon(ChevronLeft);
    submitBackIcon.style.width = '14px';
    submitBackIcon.style.height = '14px';
    submitBackIcon.style.pointerEvents = 'none';
    const submitBackButton = makeIconButton('Back to notes', submitBackIcon);
    submitBackButton.setAttribute('data-submit-back', 'true');
    submitBackButton.style.width = '24px';
    submitBackButton.style.height = '24px';
    submitBackButton.style.borderRadius = '6px';
    submitBackButton.style.border = `1.25px solid ${panelPalette.iconButtonBorder}`;
    submitBackButton.style.background = panelPalette.iconButtonBackground;
    submitBackButton.style.color = panelPalette.iconButtonColor;
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
  submitTitleInput.style.width = '100%';
  submitTitleInput.style.height = '34px';
  submitTitleInput.style.border = `1px solid ${panelPalette.inputBorder}`;
  submitTitleInput.style.borderRadius = '4px';
  submitTitleInput.style.padding = '8px 10px';
  submitTitleInput.style.background = panelPalette.inputBackground;
  submitTitleInput.style.color = panelPalette.inputText;
  submitTitleInput.style.fontFamily = FONT_STACK_SERIF;
  submitTitleInput.style.fontSize = '13px';
  submitTitleInput.style.fontWeight = '500';
  submitTitleInput.style.outline = 'none';
  submitTitleInput.style.boxShadow = 'none';
  submitTitleInput.style.caretColor = panelPalette.inputText;

  const submitDescriptionInput = document.createElement('textarea');
  submitDescriptionInput.placeholder = 'Description (optional)';
  submitDescriptionInput.style.width = '100%';
  submitDescriptionInput.style.height = '80px';
  submitDescriptionInput.style.minHeight = '80px';
  submitDescriptionInput.style.maxHeight = '120px';
  submitDescriptionInput.style.resize = 'none';
  submitDescriptionInput.style.border = `1px solid ${panelPalette.inputBorder}`;
  submitDescriptionInput.style.borderRadius = '4px';
  submitDescriptionInput.style.padding = '8px 10px';
  submitDescriptionInput.style.marginTop = '8px';
  submitDescriptionInput.style.background = panelPalette.inputBackground;
  submitDescriptionInput.style.color = panelPalette.inputText;
  submitDescriptionInput.style.fontFamily = FONT_STACK_SERIF;
  submitDescriptionInput.style.fontSize = '13px';
  submitDescriptionInput.style.lineHeight = '1.4';
  submitDescriptionInput.style.outline = 'none';
  submitDescriptionInput.style.boxShadow = 'none';
  submitDescriptionInput.style.caretColor = panelPalette.inputText;

  const syncSubmitFieldBorder = (field: HTMLInputElement | HTMLTextAreaElement, focused: boolean): void => {
    const fieldPalette = getPanelPalette();
    const focusColor = getVisualModeTokens(getColorMode()).inputFocusBorder;
    field.style.border = `1px solid ${focused ? focusColor : fieldPalette.inputBorder}`;
    field.style.boxShadow = focused ? `0 0 0 1px ${focusColor}` : 'none';
  };
  submitTitleInput.addEventListener('focus', () => syncSubmitFieldBorder(submitTitleInput, true));
  submitTitleInput.addEventListener('blur', () => syncSubmitFieldBorder(submitTitleInput, false));
  submitDescriptionInput.addEventListener('focus', () => syncSubmitFieldBorder(submitDescriptionInput, true));
  submitDescriptionInput.addEventListener('blur', () => syncSubmitFieldBorder(submitDescriptionInput, false));

  const makePropertyRow = (labelText: string, control: HTMLElement): HTMLDivElement => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.gap = '10px';
    row.style.padding = '6px 0';
    const label = document.createElement('span');
    label.textContent = labelText;
    label.style.fontSize = '11px';
    label.style.color = panelPalette.textSecondary;
    label.style.fontFamily = FONT_STACK_MONO;
    label.style.textTransform = 'uppercase';
    label.style.letterSpacing = '0.05em';
    label.style.flexShrink = '0';
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
  submitLabelsWrap.style.display = 'flex';
  submitLabelsWrap.style.flexWrap = 'nowrap';
  submitLabelsWrap.style.alignItems = 'center';
  submitLabelsWrap.style.gap = '6px';
  submitLabelsWrap.style.flex = '1 1 auto';
  submitLabelsWrap.style.minWidth = '0';
  submitLabelsWrap.style.minHeight = '32px';
  submitLabelsWrap.style.overflowX = 'auto';
  submitLabelsWrap.style.overflowY = 'hidden';
  submitLabelsWrap.style.scrollbarWidth = 'thin';

  const submitLabelControl = createSubmitLabelControl();
  submitLabelControl.container.style.width = 'auto';
  submitLabelControl.container.style.flex = '0 0 auto';

  const labelSection = document.createElement('div');
  labelSection.style.display = 'grid';
  labelSection.style.gap = '6px';
  labelSection.style.paddingTop = '8px';
  labelSection.style.marginTop = '4px';

  const labelTitle = document.createElement('span');
  labelTitle.textContent = 'Labels';
  labelTitle.style.fontSize = '11px';
  labelTitle.style.color = panelPalette.textSecondary;
  labelTitle.style.fontFamily = FONT_STACK_MONO;
  labelTitle.style.textTransform = 'uppercase';
  labelTitle.style.letterSpacing = '0.02em';

  const labelControls = document.createElement('div');
  labelControls.style.display = 'flex';
  labelControls.style.alignItems = 'center';
  labelControls.style.gap = '8px';
  labelControls.style.flexWrap = 'nowrap';
  labelControls.style.width = '100%';
  labelControls.style.minWidth = '0';
  labelControls.appendChild(submitLabelsWrap);
  labelControls.appendChild(submitLabelControl.container);

  labelSection.appendChild(labelTitle);
  labelSection.appendChild(labelControls);

  const submitConfirmButton = makeTextButton('Create ticket');
  submitConfirmButton.style.width = '100%';
  submitConfirmButton.style.marginTop = '12px';
  submitConfirmButton.style.padding = '9px 11px';

  const submitFields = document.createElement('div');
  submitFields.style.display = 'grid';
  submitFields.style.gap = '0';

  const propertiesSection = document.createElement('div');
  propertiesSection.style.paddingTop = '10px';
  propertiesSection.style.marginTop = '10px';

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
