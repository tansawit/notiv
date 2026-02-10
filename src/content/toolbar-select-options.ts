interface NamedOption {
  id: string;
  name: string;
}

interface PopulateSelectOptionsInput<T extends NamedOption> {
  select: HTMLSelectElement;
  placeholderLabel: string;
  placeholderValue?: string;
  options: readonly T[];
  candidateValue?: string;
}

export function populateSelectOptions<T extends NamedOption>(
  input: PopulateSelectOptionsInput<T>
): readonly T[] {
  const { select, placeholderLabel, placeholderValue = '', options, candidateValue } = input;
  select.textContent = '';

  const placeholder = document.createElement('option');
  placeholder.value = placeholderValue;
  placeholder.textContent = placeholderLabel;
  select.appendChild(placeholder);

  const sortedOptions = [...options].sort((a, b) => a.name.localeCompare(b.name));
  sortedOptions.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    select.appendChild(option);
  });

  const selected = candidateValue?.trim() ?? '';
  select.value = sortedOptions.some((item) => item.id === selected) ? selected : '';
  return sortedOptions;
}
