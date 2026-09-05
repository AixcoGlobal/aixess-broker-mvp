import { useLanguage } from './i18n.jsx';
import { ADMIN_COPY, translateAdmin } from './admin-copy.js';

export function useAdminTranslation() {
  const { locale, t } = useLanguage();
  return {
    locale, t,
    tr: (phrase, values) => translateAdmin(locale, phrase, values),
    errorText: (message) => translateAdmin(locale, ADMIN_COPY.some(row=>row[0]===message) ? message : 'Unable to connect. Please try again.'),
    format: (value) => new Intl.NumberFormat(locale).format(value || 0),
  };
}
