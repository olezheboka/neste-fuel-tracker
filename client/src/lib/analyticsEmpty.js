import { Inbox, CalendarX2 } from 'lucide-react';

/**
 * Builds StateBlock props for an empty analytics subsection (chart / Dynamics /
 * history table). Two contextual cases sit on top of the neutral default:
 *  - No history at all for the current selection → explain the newer chains are
 *    still accumulating data (`coming_soon` hint), no action.
 *  - History exists but none in the chosen window → offer to widen to 90 days.
 * `onWiden` is null when the 90-day preset is already active (nothing to widen).
 */
export function analyticsEmptyProps({ t, hasAnyHistory, onWiden }) {
  if (!hasAnyHistory) {
    return { icon: Inbox, message: t('states.empty'), hint: t('states.coming_soon') };
  }
  return {
    icon: CalendarX2,
    message: t('states.empty'),
    action: onWiden ? { label: t('states.try_90d'), onClick: onWiden } : undefined,
  };
}
