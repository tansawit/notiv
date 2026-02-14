export interface PriorityOption {
  value: number | null;
  label: string;
}

export const PRIORITY_SELECTION_DELAY_MS = 80;

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: null, label: 'No priority' },
  { value: 1, label: 'Urgent' },
  { value: 2, label: 'High' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Low' }
];
