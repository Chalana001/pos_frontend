import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, translateText } from '../utils/translations';

const STORAGE_KEY = 'pos_language';
const LanguageContext = createContext(null);
const nodeTextCache = new WeakMap();

const hasTranslationOptOut = (node) => {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  return !!element?.closest?.("[data-no-auto-translate='true']");
};

const shouldSkipNode = (node) => {
  const parentTag = node.parentElement?.tagName;
  return parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'TEXTAREA' || hasTranslationOptOut(node);
};

const getAttributeCacheKey = (attribute) => `i18nOriginal${attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^([a-z])/, (_, letter) => letter.toUpperCase())}`;

const translateDom = (root, language, textCache) => {
  if (!root) {
    return;
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = textWalker.nextNode();

  while (currentNode) {
    if (!shouldSkipNode(currentNode)) {
      const original = textCache.get(currentNode) ?? currentNode.textContent;
      textCache.set(currentNode, original);
      const nextText = translateText(language, original);
      if (currentNode.textContent !== nextText) {
        currentNode.textContent = nextText;
      }
    }
    currentNode = textWalker.nextNode();
  }

  const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [];
  elements.forEach((element) => {
    if (hasTranslationOptOut(element)) {
      return;
    }

    ['placeholder', 'title', 'aria-label'].forEach((attribute) => {
      const currentValue = element.getAttribute(attribute);
      if (!currentValue) {
        return;
      }

      const sourceKey = getAttributeCacheKey(attribute);
      const original = element.dataset[sourceKey] || currentValue;
      element.dataset[sourceKey] = original;
      const translated = translateText(language, original);
      if (currentValue !== translated) {
        element.setAttribute(attribute, translated);
      }
    });
  });
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || LANGUAGES.EN);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === LANGUAGES.SI ? 'si' : 'en';

    const applyTranslations = (root = document.body) => translateDom(root, language, nodeTextCache);

    applyTranslations();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            if (shouldSkipNode(node)) {
              return;
            }

            const original = nodeTextCache.get(node) ?? node.textContent;
            nodeTextCache.set(node, original);
            const translated = translateText(language, original);
            if (node.textContent !== translated) {
              node.textContent = translated;
            }
            return;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            applyTranslations(node);
          }
        });

        if (mutation.type === 'characterData' && mutation.target?.nodeType === Node.TEXT_NODE) {
          if (shouldSkipNode(mutation.target)) {
            return;
          }

          const original = nodeTextCache.get(mutation.target) ?? mutation.target.textContent;
          nodeTextCache.set(mutation.target, original);
          const translated = translateText(language, original);
          if (mutation.target.textContent !== translated) {
            mutation.target.textContent = translated;
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage === LANGUAGES.SI ? LANGUAGES.SI : LANGUAGES.EN);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (value) => translateText(language, value),
    isSinhala: language === LANGUAGES.SI,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
