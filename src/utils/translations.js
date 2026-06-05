export const LANGUAGES = {
  EN: 'en',
  SI: 'si',
};

const exactTranslations = {
  [LANGUAGES.SI]: {
    English: 'English',
    Sinhala: 'සිංහල',
    Language: 'භාෂාව',
    'Lite Monthly': 'ලයිට් මාසික',
    'Lite Yearly': 'ලයිට් වාර්ෂික',
    'Pro Monthly': 'ප්‍රෝ මාසික',
    'Pro Yearly': 'ප්‍රෝ වාර්ෂික',
    Demo: 'ඩෙමෝ',
    Dashboard: 'උපකරණ පුවරුව',
    POS: 'POS',
    Sales: 'විකුණුම්',
    Items: 'භාණ්ඩ',
    Customers: 'පාරිභෝගිකයින්',
    Shifts: 'ෂිෆ්ට්',
    Expenses: 'වියදම්',
    'Cash Drops': 'මුදල් ඉවත් කිරීම්',
    Stock: 'තොග',
    Purchase: 'මිලදී ගැනීම්',
    Reports: 'වාර්තා',
    Branches: 'ශාඛා',
    'Receipt Design': 'රිසිට් සැලසුම',
    Users: 'පරිශීලකයින්',
    'Sales History': 'විකුණුම් ඉතිහාසය',
    'Item List': 'භාණ්ඩ ලැයිස්තුව',
    'Add Item': 'භාණ්ඩයක් එක් කරන්න',
    'Bulk Add Items': 'බහු භාණ්ඩ එක් කරන්න',
    'Print Barcodes': 'බාර්කෝඩ් මුද්‍රණය',
    'Edit Item': 'භාණ්ඩය සංස්කරණය',
    'Customer List': 'පාරිභෝගික ලැයිස්තුව',
    'Add Customer': 'පාරිභෝගිකයෙක් එක් කරන්න',
    'View Customer': 'පාරිභෝගිකයා බලන්න',
    'Edit Customer': 'පාරිභෝගිකයා සංස්කරණය',
    'Active Shift': 'සක්‍රීය ෂිෆ්ට්',
    'Shift History': 'ෂිෆ්ට් ඉතිහාසය',
    'Stock List': 'තොග ලැයිස්තුව',
    Adjustments: 'සංශෝධන',
    Transfers: 'මාරුකිරීම්',
    'Purchase List': 'මිලදී ගැනීම් ලැයිස්තුව',
    'New Purchase': 'නව මිලදී ගැනීම',
    Logout: 'ඉවත් වන්න',
    'Select Branch': 'ශාඛාව තෝරන්න',
    'No Package': 'පැකේජයක් නැත',
    'Access Denied': 'ප්‍රවේශය අවහිරයි',
    "You don't have permission to access this page.": 'මෙම පිටුවට ප්‍රවේශ වීමට ඔබට අවසර නොමැත.',
    'Package Restricted': 'පැකේජ සීමාව',
    'Your current package does not include this feature.': 'ඔබගේ වත්මන් පැකේජයට මෙම පහසුකම ඇතුළත් නොවේ.',
    'ZenSys POS': 'ZenSys POS',
    'Sign in to your account': 'ඔබගේ ගිණුමට පිවිසෙන්න',
    Username: 'පරිශීලක නාමය',
    Password: 'මුරපදය',
    'Enter username': 'පරිශීලක නාමය ඇතුළත් කරන්න',
    'Enter password': 'මුරපදය ඇතුළත් කරන්න',
    'Sign In': 'පිවිසෙන්න',
    'Signing in...': 'පිවිසෙමින්...',
    'Current Order': 'දැනට ඇති ඇණවුම',
    'Add Customer (F4)': 'පාරිභෝගිකයෙක් එක් කරන්න (F4)',
    'Cart is empty': 'කාර්ට් එක හිස්ය',
    Price: 'මිල',
    'Edit Service Price': 'සේවා මිල සංස්කරණය',
    'Click to edit quantity': 'ප්‍රමාණය සංස්කරණය කිරීමට ක්ලික් කරන්න',
    'Add Discount': 'වට්ටමක් එක් කරන්න',
    'Remove Item': 'භාණ්ඩය ඉවත් කරන්න',
    'Item Discount': 'භාණ්ඩ වට්ටම',
    'Fixed (LKR)': 'ස්ථිර (රු.)',
    'Percent (%)': 'ප්‍රතිශත (%)',
    'Press Enter to apply': 'යෙදවීමට Enter ඔබන්න',
    Subtotal: 'උප එකතුව',
    'Bill Discount': 'බිල් වට්ටම',
    Total: 'මුළු එකතුව',
    'Processing...': 'සැකසෙමින්...',
    'Finalize Sale': 'විකුණුම අවසන් කරන්න',
    'Select payment method and confirm': 'ගෙවීම් ක්‍රමය තෝරා තහවුරු කරන්න',
    'Total Payable': 'ගෙවිය යුතු මුදල',
    'Cash (F1)': 'මුදල් (F1)',
    'Credit (F2)': 'ණය (F2)',
    'Cash Received': 'ලැබුණු මුදල',
    'Change to Return': 'ආපසු දිය යුතු මුදල',
    'Still Balance': 'තව ගෙවිය යුතුයි',
    'This order will be saved as a ': 'මෙම ඇණවුම මෙසේ සුරකිනු ඇත ',
    'Credit Sale': 'ණය විකිණීම',
    '. Please ensure the customer is selected before proceeding.': '. ඉදිරියට යාමට පෙර පාරිභෝගිකයා තෝරා ඇති බව තහවුරු කරන්න.',
    'Full Invoice': 'සම්පූර්ණ ඉන්වොයිසිය',
    'Print an additional professional A4 invoice after this sale is confirmed.': 'මෙම විකිණීම තහවුරු වූ පසු අමතර වෘත්තීය A4 ඉන්වොයිසියක් මුද්‍රණය කරන්න.',
    'CONFIRM & PRINT': 'තහවුරු කර මුද්‍රණය කරන්න',
    'Press Enter to complete': 'සම්පූර්ණ කිරීමට Enter ඔබන්න',
    'Items Registry': 'භාණ්ඩ ලේඛනය',
    'Manage products and pricing': 'භාණ්ඩ සහ මිල ගණන් කළමනාකරණය කරන්න',
    Barcode: 'බාර්කෝඩ්',
    Name: 'නම',
    Category: 'ප්‍රවර්ගය',
    Uncategorized: 'වර්ගීකරණය නොකළ',
    Cost: 'පිරිවැය',
    Selling: 'විකුණුම් මිල',
    Reorder: 'නැවත ඇණවුම් මට්ටම',
    Created: 'සාදන ලදි',
    Status: 'තත්ත්වය',
    Actions: 'ක්‍රියා',
    Service: 'සේවාව',
    'Weight Item': 'බර භාණ්ඩය',
    Recipe: 'වට්ටෝරු භාණ්ඩය',
    KOT: 'KOT',
    Active: 'සක්‍රීය',
    Inactive: 'අක්‍රීය',
    Edit: 'සංස්කරණය',
    'Search by name, barcode, category...': 'නම, බාර්කෝඩ්, ප්‍රවර්ගය අනුව සොයන්න...',
    'Loading items...': 'භාණ්ඩ පූරණය වෙමින්...',
    Prev: 'පෙර',
    Next: 'ඊළඟ',
    'Quick Sale': 'ක්ෂණික විකිණීම',
    'Dine In': 'අසුන් ගෙන භුක්ති විඳීම',
    'Dining Tables': 'කෑම මේස',
    Refresh: 'නැවුම් කරන්න',
    'Loading table draft...': 'මේස කෙටුම්පත පූරණය වෙමින්...',
    'Loading tables...': 'මේස පූරණය වෙමින්...',
    'No dining tables configured for this branch.': 'මෙම ශාඛාව සඳහා කෑම මේස සකසා නොමැත.',
    AVAILABLE: 'හිස්',
    OCCUPIED: 'භාවිතයේ',
    'Search barcode or name': 'බාර්කෝඩ් හෝ නම අනුව සොයන්න',
    'Select a table to load or save a draft bill': 'කෙටුම්පත් බිල්පතක් පූරණය හෝ සුරැකීමට මේසයක් තෝරන්න',
    'Open a shift to view items': 'භාණ්ඩ බැලීමට ෂිෆ්ට් එකක් අරඹන්න',
    'No items found': 'භාණ්ඩ හමු නොවීය',
    Out: 'තොග නැත',
    'Walk-in Customer': 'වෝක්-ඉන් පාරිභෝගිකයා',
    'Takeaway / Quick Sale': 'රැගෙන යාම / ක්ෂණික විකිණීම',
    'Dine-In': 'කෑමශාලාවේ',
    'Save Draft': 'කෙටුම්පත සුරකින්න',
    'Saving...': 'සුරකිමින්...',
    'Print KOT': 'KOT මුද්‍රණය',
    'Printing...': 'මුද්‍රණය වෙමින්...',
    'Select a table before saving or sending KOT.': 'සුරැකීමට හෝ KOT යැවීමට පෙර මේසයක් තෝරන්න.',
    'No KOT-enabled items in the cart.': 'KOT සක්‍රීය භාණ්ඩ කාර්ට් එකේ නොමැත.',
    'KOT already sent for current items. Add new kitchen items to print again.': 'වර්තමාන භාණ්ඩ සඳහා KOT දැනටමත් යවා ඇත. නැවත මුද්‍රණයට නව කුස්සිය භාණ්ඩ එක් කරන්න.',
    'Checkout Table (F9)': 'මේසය පිරික්සීම (F9)',
    'Checkout (F9)': 'පිටවීම (F9)',
    'All Branches': 'සියලුම ශාඛා',
    ADMIN: 'පරිපාලක',
    MANAGER: 'කළමනාකරු',
    CASHIER: 'කෑෂියර්',
    'Session expired. Please log in again.': 'සැසිය කල් ඉකුත් වී ඇත. කරුණාකර නැවත පිවිසෙන්න.',
    'Something went wrong!': 'යම් දෝෂයක් සිදුවී ඇත!',
    'Network Error! Please check your connection or server.': 'ජාල දෝෂයකි! ඔබගේ සම්බන්ධතාවය හෝ සේවාදායකය පරීක්ෂා කරන්න.',
    'Subscription Expired! Please renew your plan.': 'දායකත්වය කල් ඉකුත් වී ඇත! කරුණාකර ඔබගේ සැලැස්ම අලුත් කරන්න.',
    "Access Denied! You don't have permission to perform this action.": 'ප්‍රවේශය අවහිරයි! මෙම ක්‍රියාව සිදු කිරීමට ඔබට අවසර නැත.',
    'Please enter username and password': 'කරුණාකර පරිශීලක නාමය සහ මුරපදය ඇතුළත් කරන්න',
    'Invalid credentials': 'වැරදි පිවිසුම් තොරතුරු',
    'Failed to fetch items': 'භාණ්ඩ ලබා ගැනීමට අසාර්ථක විය',
    'Failed to load products': 'භාණ්ඩ පූරණය කිරීමට අසාර්ථක විය',
    'Failed to load dining tables': 'කෑම මේස පූරණය කිරීමට අසාර්ථක විය',
    'Please open a shift first!': 'කරුණාකර මුලින්ම ෂිෆ්ට් එකක් අරඹන්න!',
    'Insufficient stock! Available:': 'ප්‍රමාණවත් තොග නොමැත! ලබාගත හැක්කේ:',
    'Low stock. Available:': 'අඩු තොග. ලබාගත හැක්කේ:',
    'Item not found!': 'භාණ්ඩය හමු නොවීය!',
    'Item is Out of Stock!': 'භාණ්ඩය තොගයෙන් අවසන්!',
    'Low stock.': 'අඩු තොග.',
    'Select a table before checkout': 'Checkout කිරීමට පෙර මේසයක් තෝරන්න',
    'No active shift. Cannot checkout.': 'සක්‍රීය ෂිෆ්ට් එකක් නොමැත. Checkout කළ නොහැක.',
    'Insufficient amount': 'ප්‍රමාණවත් මුදලක් නැත',
    'Select customer for credit': 'ණය විකිණීම සඳහා පාරිභෝගිකයෙක් තෝරන්න',
    Failed: 'අසාර්ථක විය',
  },
};

const patternTranslations = {
  [LANGUAGES.SI]: [
    {
      regex: /^Welcome back, (.+)!$/,
      translate: ([, name]) => `නැවත සාදරයෙන් පිළිගනිමු, ${name}!`,
    },
    {
      regex: /^Valid until (.+)$/,
      translate: ([, value]) => `${value} දක්වා වලංගුයි`,
    },
    {
      regex: /^Branch: #(.+)$/,
      translate: ([, value]) => `ශාඛාව: #${value}`,
    },
    {
      regex: /^Branch: (.+)$/,
      translate: ([, value]) => `ශාඛාව: ${value}`,
    },
    {
      regex: /^Selected: (.+)$/,
      translate: ([, value]) => `තෝරාගත් මේසය: ${value}`,
    },
    {
      regex: /^Page (\d+) of (\d+)$/,
      translate: ([, current, total]) => `පිටුව ${current} / ${total}`,
    },
    {
      regex: /^New Sale \(Branch: (.+)\)$/,
      translate: ([, branch]) => `නව විකිණීම (ශාඛාව: ${branch})`,
    },
    {
      regex: /^(\d+) Items$/,
      translate: ([, count]) => `භාණ්ඩ ${count}`,
    },
    {
      regex: /^Order ID: (.+)$/,
      translate: ([, value]) => `ඇණවුම් අංකය: ${value}`,
    },
    {
      regex: /^Invoice: (.+)$/,
      translate: ([, value]) => `ඉන්වොයිස් අංකය: ${value}`,
    },
    {
      regex: /^Date: (.+)$/,
      translate: ([, value]) => `දිනය: ${value}`,
    },
    {
      regex: /^Cashier: (.+)$/,
      translate: ([, value]) => `කෑෂියර්: ${value}`,
    },
    {
      regex: /^Customer: (.+)$/,
      translate: ([, value]) => `පාරිභෝගිකයා: ${value}`,
    },
    {
      regex: /^Mode: (.+)$/,
      translate: ([, value]) => `මාදිලිය: ${value}`,
    },
    {
      regex: /^Table: (.+)$/,
      translate: ([, value]) => `මේසය: ${value}`,
    },
  ],
};

const normalizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

export const translateText = (language, value) => {
  if (language !== LANGUAGES.SI) {
    return value;
  }

  const original = String(value ?? '');
  const normalized = normalizeText(original);

  const exact = exactTranslations[language]?.[normalized];
  if (exact) {
    return original.replace(normalized, exact);
  }

  const patterns = patternTranslations[language] || [];
  for (const rule of patterns) {
    const match = normalized.match(rule.regex);
    if (match) {
      const translated = rule.translate(match);
      return original.replace(normalized, translated);
    }
  }

  return value;
};
