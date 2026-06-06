const DEFAULT_PRINT_AGENT_URL = 'http://127.0.0.1:9797';
const DEFAULT_PRINT_AGENT_TOKEN = 'pos-local-print-token';

export const PRINT_AGENT_ERROR_CODES = {
  UNAVAILABLE: 'PRINT_AGENT_UNAVAILABLE',
  FAILED: 'PRINT_AGENT_FAILED',
};

const getAgentUrl = () =>
  String(import.meta.env.VITE_PRINT_AGENT_URL || DEFAULT_PRINT_AGENT_URL).replace(/\/+$/, '');

const getAgentToken = () =>
  String(import.meta.env.VITE_PRINT_AGENT_TOKEN || localStorage.getItem('pos-print-agent-token') || DEFAULT_PRINT_AGENT_TOKEN);

const requestPrintAgent = async (path, options = {}) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), Number(options.timeoutMs || 6000));

  try {
    const response = await fetch(`${getAgentUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Print-Agent-Token': getAgentToken(),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const error = new Error(data.message || `Printer service failed: ${response.status}`);
      error.code = PRINT_AGENT_ERROR_CODES.FAILED;
      error.details = data.details;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      const unavailableError = new Error('Local printer service is not available');
      unavailableError.code = PRINT_AGENT_ERROR_CODES.UNAVAILABLE;
      throw unavailableError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const printerAgentAPI = {
  health: () => requestPrintAgent('/health', { method: 'GET', timeoutMs: 2500 }),

  printers: () => requestPrintAgent('/printers', { method: 'GET', timeoutMs: 4000 }),

  testPrint: ({ printerName, paperWidth = '80mm', copies = 1, label = 'POS Test' }) =>
    requestPrintAgent('/print/test', {
      method: 'POST',
      body: JSON.stringify({ printerName, paperWidth, copies, label }),
      timeoutMs: 12000,
    }),

  printReceipt: ({ printerName, html, paperWidth = '80mm', copies = 1 }) =>
    requestPrintAgent('/print/receipt', {
      method: 'POST',
      body: JSON.stringify({ printerName, html, paperWidth, copies }),
      timeoutMs: 20000,
    }),

  printKot: ({ printerName, html, paperWidth = '80mm', copies = 1 }) =>
    requestPrintAgent('/print/kot', {
      method: 'POST',
      body: JSON.stringify({ printerName, html, paperWidth, copies }),
      timeoutMs: 20000,
    }),
};

export const getPrintPaperWidth = (settings, fallback = '80mm') => {
  const width = Number(settings?.paperWidthMm || 80);
  if (width <= 60) return '58mm';
  if (width >= 200) return 'A4';
  return fallback;
};
