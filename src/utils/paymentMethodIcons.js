// Dynamic payment-method icon resolver. Resolution order:
//   1. a valid configured iconKey (an approved semantic lucide icon), then
//   2. a mapping from the method's authoritative category, then
//   3. a generic wallet/payment icon.
// A method with no usable icon stays fully functional; it just renders the
// generic icon. New methods never need a frontend deploy to display.
import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  CheckCircle2,
  Wallet,
  FileText,
  QrCode,
  ReceiptText,
  HandCoins,
} from "lucide-react";

// Approved semantic icon keys an admin may pick in Settings. Keep this list
// small and semantic; brand icons (Visa/Mastercard) are intentionally absent.
const ICONS = {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  CheckCircle2,
  Wallet,
  FileText,
  QrCode,
  ReceiptText,
  HandCoins,
};

const CATEGORY_ICONS = {
  CASH: Banknote,
  CARD: CreditCard,
  BANK_TRANSFER: Landmark,
  MOBILE_DIGITAL: Smartphone,
  CREDIT: CheckCircle2,
  OTHER: Wallet,
};

export const PAYMENT_ICON_OPTIONS = Object.keys(ICONS);

export function resolvePaymentIcon(method) {
  if (method?.iconKey && ICONS[method.iconKey]) {
    return ICONS[method.iconKey];
  }
  if (method?.category && CATEGORY_ICONS[method.category]) {
    return CATEGORY_ICONS[method.category];
  }
  return Wallet;
}
