import React, { createContext, useState } from 'react';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr'); // Default French
  const [currency, setCurrency] = useState('TND'); // Default TND for BIAT Tunisia!

  const translations = { en, fr };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (let k of keys) value = value?.[k];
    return value || key;
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    
    if (currency === 'TND') {
      // 1 USD = 3.1 TND (Tunisian Dinar)
      const tnd = num * 3.1;
      return `${tnd.toFixed(2)} د.ت`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currency, setCurrency, t, formatCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => React.useContext(LanguageContext);
