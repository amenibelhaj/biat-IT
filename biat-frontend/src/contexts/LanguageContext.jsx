/*
 * Language and currency.
 *
 * All monetary values are STORED IN TUNISIAN DINAR (TND) by the backend —
 * the replacement-cost catalogue is denominated in TND. The previous
 * version treated stored values as USD and multiplied by 3.1 to display
 * TND, which inflated every figure on the financial screens by 3.1x.
 * TND is therefore the base unit here, and USD is the converted view.
 */

import React, { createContext, useState, useMemo } from 'react';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

export const LanguageContext = createContext();

// Indicative rate, for display only. Update as needed.
const TND_PER_USD = 3.1;

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr');
  const [currency, setCurrency] = useState('TND');

  const value = useMemo(() => {
    const translations = { en, fr };

    const t = (key) => {
      const parts = key.split('.');
      let node = translations[language];
      for (const p of parts) node = node?.[p];
      return node !== undefined && node !== null ? node : key;
    };

    const locale = language === 'fr' ? 'fr-FR' : 'en-US';

    /** Full amount, e.g. "419 000 DT" */
    const formatCurrency = (amount) => {
      const tnd = parseFloat(amount) || 0;
      if (currency === 'USD') {
        const usd = tnd / TND_PER_USD;
        return `$${usd.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
      }
      return `${tnd.toLocaleString(locale, { maximumFractionDigits: 0 })} DT`;
    };

    /** Abbreviated, for axis labels and KPI tiles, e.g. "419 k DT" */
    const formatCompact = (amount) => {
      const base = parseFloat(amount) || 0;
      const v = currency === 'USD' ? base / TND_PER_USD : base;
      const unit = currency === 'USD' ? '$' : ' DT';
      const abs = Math.abs(v);
      if (abs >= 1e6) return `${currency === 'USD' ? '$' : ''}${(v / 1e6).toFixed(1)} M${currency === 'USD' ? '' : ' DT'}`;
      if (abs >= 1e3) return `${currency === 'USD' ? '$' : ''}${Math.round(v / 1e3)} k${currency === 'USD' ? '' : ' DT'}`;
      return currency === 'USD' ? `$${Math.round(v)}` : `${Math.round(v)}${unit}`;
    };

    return { language, setLanguage, currency, setCurrency, t, formatCurrency, formatCompact, locale };
  }, [language, currency]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => React.useContext(LanguageContext);
