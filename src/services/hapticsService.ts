import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Trigger subtle light haptic feedback (for tab switches, card taps, day changes)
 */
export async function triggerLightHaptic(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(8);
    }
  }
}

/**
 * Trigger medium haptic feedback (for modal opens, saving, theme toggle)
 */
export async function triggerMediumHaptic(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }
}

/**
 * Trigger success haptic feedback (for export complete, sync complete)
 */
export async function triggerSuccessHaptic(): Promise<void> {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 30, 15]);
    }
  }
}

/**
 * Trigger selection haptic (for toggles, filters)
 */
export async function triggerSelectionHaptic(): Promise<void> {
  try {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }
}
