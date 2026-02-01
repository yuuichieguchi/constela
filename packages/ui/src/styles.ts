/**
 * All UI style preset definitions
 *
 * Each style preset conforms to the StylePreset interface from @constela/core.
 * Type validation is performed at runtime via validateStylePreset().
 */

// Style imports
import accordionStyles from '../components/accordion/accordion.styles.json' with { type: 'json' };
import alertStyles from '../components/alert/alert.styles.json' with { type: 'json' };
import avatarStyles from '../components/avatar/avatar.styles.json' with { type: 'json' };
import badgeStyles from '../components/badge/badge.styles.json' with { type: 'json' };
import breadcrumbStyles from '../components/breadcrumb/breadcrumb.styles.json' with { type: 'json' };
import buttonStyles from '../components/button/button.styles.json' with { type: 'json' };
import calendarStyles from '../components/calendar/calendar.styles.json' with { type: 'json' };
import cardStyles from '../components/card/card.styles.json' with { type: 'json' };
import chartStyles from '../components/chart/chart.styles.json' with { type: 'json' };
import checkboxStyles from '../components/checkbox/checkbox.styles.json' with { type: 'json' };
import containerStyles from '../components/container/container.styles.json' with { type: 'json' };
import dataTableStyles from '../components/data-table/data-table.styles.json' with { type: 'json' };
import datepickerStyles from '../components/datepicker/datepicker.styles.json' with { type: 'json' };
import dialogStyles from '../components/dialog/dialog.styles.json' with { type: 'json' };
import gridStyles from '../components/grid/grid.styles.json' with { type: 'json' };
import inputStyles from '../components/input/input.styles.json' with { type: 'json' };
import paginationStyles from '../components/pagination/pagination.styles.json' with { type: 'json' };
import popoverStyles from '../components/popover/popover.styles.json' with { type: 'json' };
import radioStyles from '../components/radio/radio.styles.json' with { type: 'json' };
import selectStyles from '../components/select/select.styles.json' with { type: 'json' };
import skeletonStyles from '../components/skeleton/skeleton.styles.json' with { type: 'json' };
import stackStyles from '../components/stack/stack.styles.json' with { type: 'json' };
import switchStyles from '../components/switch/switch.styles.json' with { type: 'json' };
import tabsStyles from '../components/tabs/tabs.styles.json' with { type: 'json' };
import textareaStyles from '../components/textarea/textarea.styles.json' with { type: 'json' };
import toastStyles from '../components/toast/toast.styles.json' with { type: 'json' };
import tooltipStyles from '../components/tooltip/tooltip.styles.json' with { type: 'json' };
import treeStyles from '../components/tree/tree.styles.json' with { type: 'json' };
import virtualScrollStyles from '../components/virtual-scroll/virtual-scroll.styles.json' with { type: 'json' };

/**
 * All available style presets (flattened from style files)
 */
export const styles = {
  ...accordionStyles,
  ...alertStyles,
  ...avatarStyles,
  ...badgeStyles,
  ...breadcrumbStyles,
  ...buttonStyles,
  ...calendarStyles,
  ...cardStyles,
  ...chartStyles,
  ...checkboxStyles,
  ...containerStyles,
  ...dataTableStyles,
  ...datepickerStyles,
  ...dialogStyles,
  ...gridStyles,
  ...inputStyles,
  ...paginationStyles,
  ...popoverStyles,
  ...radioStyles,
  ...selectStyles,
  ...skeletonStyles,
  ...stackStyles,
  ...switchStyles,
  ...tabsStyles,
  ...textareaStyles,
  ...toastStyles,
  ...tooltipStyles,
  ...treeStyles,
  ...virtualScrollStyles,
} as const;

/**
 * Available style preset names
 */
export type StyleName = keyof typeof styles;
