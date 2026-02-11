import type { PanelPalette } from './toolbar-palette';
import type { SubmitDropdownControl, SubmitLabelSearchControl } from './base-combobox-control';
import { getVisualModeTokens } from '../shared/visual-tokens';

interface ApplyPanelModeInput {
  palette: PanelPalette;
  darkMode: boolean;
  submitPanel: HTMLDivElement;
  queuePanel: HTMLDivElement;
  settingsPanel: HTMLDivElement;
  submitMeta: HTMLDivElement;
  submitTitleInput: HTMLInputElement;
  submitDescriptionInput: HTMLTextAreaElement;
  submitDropdownControls: SubmitDropdownControl[];
  submitLabelControl: SubmitLabelSearchControl;
  queueSubmitButton: HTMLButtonElement;
  submitConfirmButton: HTMLButtonElement;
  submitTriageInput: HTMLInputElement;
  onPublishThemeMode: () => void;
}

function stylePrimaryActionButton(button: HTMLButtonElement, darkMode: boolean): void {
  const tokens = getVisualModeTokens(darkMode ? 'dark' : 'light');
  button.style.border = `1.25px solid ${tokens.primaryAction.border}`;
  button.style.background = tokens.primaryAction.background;
  button.style.color = tokens.primaryAction.color;
}

export function applyPanelModeStyles(input: ApplyPanelModeInput): void {
  const {
    palette,
    darkMode,
    submitPanel,
    queuePanel,
    settingsPanel,
    submitMeta,
    submitTitleInput,
    submitDescriptionInput,
    submitDropdownControls,
    submitLabelControl,
    queueSubmitButton,
    submitConfirmButton,
    submitTriageInput,
    onPublishThemeMode
  } = input;

  [submitPanel, queuePanel, settingsPanel].forEach((panel) => {
    panel.style.border = `1.25px solid ${palette.shellBorder}`;
    panel.style.background = palette.shellBackground;
    panel.style.boxShadow = palette.shellShadow;
    const heading = panel.firstElementChild;
    if (heading instanceof HTMLElement) {
      heading.style.color = palette.headingColor;
    }
  });

  submitMeta.style.color = palette.textSecondary;

  const titleFocused = document.activeElement === submitTitleInput;
  const descriptionFocused = document.activeElement === submitDescriptionInput;
  const tokens = getVisualModeTokens(darkMode ? 'dark' : 'light');
  const focusColor = tokens.inputFocusBorder;
  submitTitleInput.style.border = `1px solid ${titleFocused ? focusColor : palette.inputBorder}`;
  submitTitleInput.style.background = palette.inputBackground;
  submitTitleInput.style.color = palette.inputText;
  submitTitleInput.style.caretColor = palette.inputText;
  submitTitleInput.style.boxShadow = titleFocused ? `0 0 0 1px ${focusColor}` : 'none';

  submitDescriptionInput.style.border = `1px solid ${descriptionFocused ? focusColor : palette.inputBorder}`;
  submitDescriptionInput.style.background = palette.inputBackground;
  submitDescriptionInput.style.color = palette.inputText;
  submitDescriptionInput.style.caretColor = palette.inputText;
  submitDescriptionInput.style.boxShadow = descriptionFocused ? `0 0 0 1px ${focusColor}` : 'none';

  const submitBackButton = submitPanel.querySelector<HTMLButtonElement>('[data-submit-back="true"]');
  if (submitBackButton) {
    submitBackButton.style.border = `1.25px solid ${palette.iconButtonBorder}`;
    submitBackButton.style.background = palette.iconButtonBackground;
    submitBackButton.style.color = palette.iconButtonColor;
  }

  submitDropdownControls.forEach((control) => {
    control.syncTheme();
    control.refresh();
  });
  submitLabelControl.syncTheme();
  submitLabelControl.refresh();

  stylePrimaryActionButton(queueSubmitButton, darkMode);
  stylePrimaryActionButton(submitConfirmButton, darkMode);
  submitTriageInput.style.accentColor = tokens.triageAccent;

  onPublishThemeMode();
}
