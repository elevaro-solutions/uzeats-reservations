import enUS from 'antd/locale/en_US';
import type { Locale } from 'antd/es/locale';

/**
 * Ant Design `en_US` leaves `fieldDateFormat` unset, so rc-picker falls back to
 * `YYYY-MM-DD`. Override to US month-first formats (matches antd's own example.json).
 */
export const antdUsLocale = {
  ...enUS,
  DatePicker: {
    ...enUS.DatePicker,
    lang: {
      ...enUS.DatePicker?.lang,
      fieldDateFormat: 'M/D/YYYY',
      fieldDateTimeFormat: 'M/D/YYYY HH:mm:ss',
      fieldMonthFormat: 'MMM YYYY',
      fieldTimeFormat: 'h:mm A',
    },
  },
  Calendar: {
    ...enUS.Calendar,
    lang: {
      ...enUS.Calendar?.lang,
      fieldDateFormat: 'M/D/YYYY',
      fieldDateTimeFormat: 'M/D/YYYY HH:mm:ss',
      fieldMonthFormat: 'MMM YYYY',
    },
  },
} as Locale;
