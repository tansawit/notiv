import { STORAGE_KEYS } from '../../shared/constants';
import { useStorageToggle } from '../../shared/use-storage-toggle';

interface UseCaptureRedactionOptions {
  setFeedback: (notice: string | null, error: string | null) => void;
}

interface UseCaptureRedactionResult {
  captureRedactionEnabled: boolean;
  captureRedactionBusy: boolean;
  toggleCaptureRedaction: () => Promise<void>;
}

export function useCaptureRedaction(options: UseCaptureRedactionOptions): UseCaptureRedactionResult {
  const { enabled, busy, toggle } = useStorageToggle({
    storageKey: STORAGE_KEYS.captureRedactionEnabled,
    defaultValue: true,
    setFeedback: options.setFeedback,
    messages: {
      enabledNotice: 'Capture redaction enabled.',
      disabledNotice: 'Capture redaction disabled.',
      loadError: 'Could not load capture privacy settings.',
      saveError: 'Could not update capture privacy settings.'
    }
  });

  return {
    captureRedactionEnabled: enabled,
    captureRedactionBusy: busy,
    toggleCaptureRedaction: toggle
  };
}
