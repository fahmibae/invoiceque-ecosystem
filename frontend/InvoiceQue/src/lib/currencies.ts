export interface CurrencyInfo {
  code: string;
  flag: string;
  symbol: string;
  name: string;
  noDecimals?: boolean;
}

export const POPULAR_CURRENCIES: string[] = [
  'IDR', 'USD', 'EUR', 'GBP', 'SGD', 'MYR', 'JPY', 'AUD', 'CNY', 'KRW',
];

export const ALL_CURRENCIES: CurrencyInfo[] = [
  { code: 'AED', flag: '🇦🇪', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'AFN', flag: '🇦🇫', symbol: '؋', name: 'Afghan Afghani' },
  { code: 'ALL', flag: '🇦🇱', symbol: 'L', name: 'Albanian Lek' },
  { code: 'AMD', flag: '🇦🇲', symbol: '֏', name: 'Armenian Dram' },
  { code: 'ANG', flag: '🇨🇼', symbol: 'ƒ', name: 'Antillean Guilder' },
  { code: 'AOA', flag: '🇦🇴', symbol: 'Kz', name: 'Angolan Kwanza' },
  { code: 'ARS', flag: '🇦🇷', symbol: '$', name: 'Argentine Peso' },
  { code: 'AUD', flag: '🇦🇺', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'AWG', flag: '🇦🇼', symbol: 'ƒ', name: 'Aruban Florin' },
  { code: 'AZN', flag: '🇦🇿', symbol: '₼', name: 'Azerbaijani Manat' },
  { code: 'BAM', flag: '🇧🇦', symbol: 'KM', name: 'Bosnia Mark' },
  { code: 'BBD', flag: '🇧🇧', symbol: 'Bds$', name: 'Barbadian Dollar' },
  { code: 'BDT', flag: '🇧🇩', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'BGN', flag: '🇧🇬', symbol: 'лв', name: 'Bulgarian Lev' },
  { code: 'BHD', flag: '🇧🇭', symbol: '.د.ب', name: 'Bahraini Dinar' },
  { code: 'BIF', flag: '🇧🇮', symbol: 'FBu', name: 'Burundian Franc', noDecimals: true },
  { code: 'BMD', flag: '🇧🇲', symbol: 'BD$', name: 'Bermudan Dollar' },
  { code: 'BND', flag: '🇧🇳', symbol: 'B$', name: 'Brunei Dollar' },
  { code: 'BOB', flag: '🇧🇴', symbol: 'Bs.', name: 'Bolivian Boliviano' },
  { code: 'BRL', flag: '🇧🇷', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'BSD', flag: '🇧🇸', symbol: 'B$', name: 'Bahamian Dollar' },
  { code: 'BTN', flag: '🇧🇹', symbol: 'Nu.', name: 'Bhutanese Ngultrum' },
  { code: 'BWP', flag: '🇧🇼', symbol: 'P', name: 'Botswanan Pula' },
  { code: 'BYN', flag: '🇧🇾', symbol: 'Br', name: 'Belarusian Ruble' },
  { code: 'BZD', flag: '🇧🇿', symbol: 'BZ$', name: 'Belize Dollar' },
  { code: 'CAD', flag: '🇨🇦', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CDF', flag: '🇨🇩', symbol: 'FC', name: 'Congolese Franc' },
  { code: 'CHF', flag: '🇨🇭', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CLP', flag: '🇨🇱', symbol: '$', name: 'Chilean Peso', noDecimals: true },
  { code: 'CNY', flag: '🇨🇳', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'COP', flag: '🇨🇴', symbol: '$', name: 'Colombian Peso' },
  { code: 'CRC', flag: '🇨🇷', symbol: '₡', name: 'Costa Rican Colón' },
  { code: 'CUP', flag: '🇨🇺', symbol: '₱', name: 'Cuban Peso' },
  { code: 'CVE', flag: '🇨🇻', symbol: '$', name: 'Cape Verdean Escudo' },
  { code: 'CZK', flag: '🇨🇿', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'DJF', flag: '🇩🇯', symbol: 'Fdj', name: 'Djiboutian Franc', noDecimals: true },
  { code: 'DKK', flag: '🇩🇰', symbol: 'kr', name: 'Danish Krone' },
  { code: 'DOP', flag: '🇩🇴', symbol: 'RD$', name: 'Dominican Peso' },
  { code: 'DZD', flag: '🇩🇿', symbol: 'د.ج', name: 'Algerian Dinar' },
  { code: 'EGP', flag: '🇪🇬', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'ERN', flag: '🇪🇷', symbol: 'Nfk', name: 'Eritrean Nakfa' },
  { code: 'ETB', flag: '🇪🇹', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'EUR', flag: '🇪🇺', symbol: '€', name: 'Euro' },
  { code: 'FJD', flag: '🇫🇯', symbol: 'FJ$', name: 'Fijian Dollar' },
  { code: 'FKP', flag: '🇫🇰', symbol: '£', name: 'Falkland Islands Pound' },
  { code: 'GBP', flag: '🇬🇧', symbol: '£', name: 'British Pound' },
  { code: 'GEL', flag: '🇬🇪', symbol: '₾', name: 'Georgian Lari' },
  { code: 'GHS', flag: '🇬🇭', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'GIP', flag: '🇬🇮', symbol: '£', name: 'Gibraltar Pound' },
  { code: 'GMD', flag: '🇬🇲', symbol: 'D', name: 'Gambian Dalasi' },
  { code: 'GNF', flag: '🇬🇳', symbol: 'FG', name: 'Guinean Franc', noDecimals: true },
  { code: 'GTQ', flag: '🇬🇹', symbol: 'Q', name: 'Guatemalan Quetzal' },
  { code: 'GYD', flag: '🇬🇾', symbol: 'GY$', name: 'Guyanaese Dollar' },
  { code: 'HKD', flag: '🇭🇰', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'HNL', flag: '🇭🇳', symbol: 'L', name: 'Honduran Lempira' },
  { code: 'HRK', flag: '🇭🇷', symbol: 'kn', name: 'Croatian Kuna' },
  { code: 'HTG', flag: '🇭🇹', symbol: 'G', name: 'Haitian Gourde' },
  { code: 'HUF', flag: '🇭🇺', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'IDR', flag: '🇮🇩', symbol: 'Rp', name: 'Indonesian Rupiah', noDecimals: true },
  { code: 'ILS', flag: '🇮🇱', symbol: '₪', name: 'Israeli Sheqel' },
  { code: 'INR', flag: '🇮🇳', symbol: '₹', name: 'Indian Rupee' },
  { code: 'IQD', flag: '🇮🇶', symbol: 'ع.د', name: 'Iraqi Dinar' },
  { code: 'IRR', flag: '🇮🇷', symbol: '﷼', name: 'Iranian Rial', noDecimals: true },
  { code: 'ISK', flag: '🇮🇸', symbol: 'kr', name: 'Icelandic Króna', noDecimals: true },
  { code: 'JMD', flag: '🇯🇲', symbol: 'J$', name: 'Jamaican Dollar' },
  { code: 'JOD', flag: '🇯🇴', symbol: 'JD', name: 'Jordanian Dinar' },
  { code: 'JPY', flag: '🇯🇵', symbol: '¥', name: 'Japanese Yen', noDecimals: true },
  { code: 'KES', flag: '🇰🇪', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'KGS', flag: '🇰🇬', symbol: 'сом', name: 'Kyrgystani Som' },
  { code: 'KHR', flag: '🇰🇭', symbol: '៛', name: 'Cambodian Riel' },
  { code: 'KMF', flag: '🇰🇲', symbol: 'CF', name: 'Comorian Franc', noDecimals: true },
  { code: 'KPW', flag: '🇰🇵', symbol: '₩', name: 'North Korean Won' },
  { code: 'KRW', flag: '🇰🇷', symbol: '₩', name: 'South Korean Won', noDecimals: true },
  { code: 'KWD', flag: '🇰🇼', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'KYD', flag: '🇰🇾', symbol: 'CI$', name: 'Cayman Islands Dollar' },
  { code: 'KZT', flag: '🇰🇿', symbol: '₸', name: 'Kazakhstani Tenge' },
  { code: 'LAK', flag: '🇱🇦', symbol: '₭', name: 'Laotian Kip' },
  { code: 'LBP', flag: '🇱🇧', symbol: 'L£', name: 'Lebanese Pound' },
  { code: 'LKR', flag: '🇱🇰', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'LRD', flag: '🇱🇷', symbol: 'L$', name: 'Liberian Dollar' },
  { code: 'LSL', flag: '🇱🇸', symbol: 'L', name: 'Lesotho Loti' },
  { code: 'LYD', flag: '🇱🇾', symbol: 'ل.د', name: 'Libyan Dinar' },
  { code: 'MAD', flag: '🇲🇦', symbol: 'MAD', name: 'Moroccan Dirham' },
  { code: 'MDL', flag: '🇲🇩', symbol: 'L', name: 'Moldovan Leu' },
  { code: 'MGA', flag: '🇲🇬', symbol: 'Ar', name: 'Malagasy Ariary' },
  { code: 'MKD', flag: '🇲🇰', symbol: 'ден', name: 'Macedonian Denar' },
  { code: 'MMK', flag: '🇲🇲', symbol: 'K', name: 'Myanmar Kyat' },
  { code: 'MNT', flag: '🇲🇳', symbol: '₮', name: 'Mongolian Tugrik' },
  { code: 'MOP', flag: '🇲🇴', symbol: 'MOP$', name: 'Macanese Pataca' },
  { code: 'MRU', flag: '🇲🇷', symbol: 'UM', name: 'Mauritanian Ouguiya' },
  { code: 'MUR', flag: '🇲🇺', symbol: '₨', name: 'Mauritian Rupee' },
  { code: 'MVR', flag: '🇲🇻', symbol: 'Rf', name: 'Maldivian Rufiyaa' },
  { code: 'MWK', flag: '🇲🇼', symbol: 'MK', name: 'Malawian Kwacha' },
  { code: 'MXN', flag: '🇲🇽', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'MYR', flag: '🇲🇾', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'MZN', flag: '🇲🇿', symbol: 'MT', name: 'Mozambican Metical' },
  { code: 'NAD', flag: '🇳🇦', symbol: 'N$', name: 'Namibian Dollar' },
  { code: 'NGN', flag: '🇳🇬', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'NIO', flag: '🇳🇮', symbol: 'C$', name: 'Nicaraguan Córdoba' },
  { code: 'NOK', flag: '🇳🇴', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'NPR', flag: '🇳🇵', symbol: '₨', name: 'Nepalese Rupee' },
  { code: 'NZD', flag: '🇳🇿', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'OMR', flag: '🇴🇲', symbol: '﷼', name: 'Omani Rial' },
  { code: 'PAB', flag: '🇵🇦', symbol: 'B/.', name: 'Panamanian Balboa' },
  { code: 'PEN', flag: '🇵🇪', symbol: 'S/.', name: 'Peruvian Sol' },
  { code: 'PGK', flag: '🇵🇬', symbol: 'K', name: 'Papua New Guinean Kina' },
  { code: 'PHP', flag: '🇵🇭', symbol: '₱', name: 'Philippine Peso' },
  { code: 'PKR', flag: '🇵🇰', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'PLN', flag: '🇵🇱', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'PYG', flag: '🇵🇾', symbol: '₲', name: 'Paraguayan Guarani', noDecimals: true },
  { code: 'QAR', flag: '🇶🇦', symbol: '﷼', name: 'Qatari Rial' },
  { code: 'RON', flag: '🇷🇴', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'RSD', flag: '🇷🇸', symbol: 'дин.', name: 'Serbian Dinar' },
  { code: 'RUB', flag: '🇷🇺', symbol: '₽', name: 'Russian Ruble' },
  { code: 'RWF', flag: '🇷🇼', symbol: 'RF', name: 'Rwandan Franc', noDecimals: true },
  { code: 'SAR', flag: '🇸🇦', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'SBD', flag: '🇸🇧', symbol: 'SI$', name: 'Solomon Islands Dollar' },
  { code: 'SCR', flag: '🇸🇨', symbol: '₨', name: 'Seychellois Rupee' },
  { code: 'SDG', flag: '🇸🇩', symbol: 'ج.س.', name: 'Sudanese Pound' },
  { code: 'SEK', flag: '🇸🇪', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'SGD', flag: '🇸🇬', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'SHP', flag: '🇸🇭', symbol: '£', name: 'Saint Helena Pound' },
  { code: 'SLE', flag: '🇸🇱', symbol: 'Le', name: 'Sierra Leonean Leone' },
  { code: 'SOS', flag: '🇸🇴', symbol: 'Sh', name: 'Somali Shilling' },
  { code: 'SRD', flag: '🇸🇷', symbol: '$', name: 'Surinamese Dollar' },
  { code: 'SSP', flag: '🇸🇸', symbol: '£', name: 'South Sudanese Pound' },
  { code: 'STN', flag: '🇸🇹', symbol: 'Db', name: 'São Tomé Dobra' },
  { code: 'SYP', flag: '🇸🇾', symbol: '£', name: 'Syrian Pound' },
  { code: 'SZL', flag: '🇸🇿', symbol: 'E', name: 'Swazi Lilangeni' },
  { code: 'THB', flag: '🇹🇭', symbol: '฿', name: 'Thai Baht' },
  { code: 'TJS', flag: '🇹🇯', symbol: 'SM', name: 'Tajikistani Somoni' },
  { code: 'TMT', flag: '🇹🇲', symbol: 'T', name: 'Turkmenistani Manat' },
  { code: 'TND', flag: '🇹🇳', symbol: 'د.ت', name: 'Tunisian Dinar' },
  { code: 'TOP', flag: '🇹🇴', symbol: 'T$', name: "Tongan Pa'anga" },
  { code: 'TRY', flag: '🇹🇷', symbol: '₺', name: 'Turkish Lira' },
  { code: 'TTD', flag: '🇹🇹', symbol: 'TT$', name: 'Trinidad Dollar' },
  { code: 'TWD', flag: '🇹🇼', symbol: 'NT$', name: 'New Taiwan Dollar' },
  { code: 'TZS', flag: '🇹🇿', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UAH', flag: '🇺🇦', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'UGX', flag: '🇺🇬', symbol: 'USh', name: 'Ugandan Shilling', noDecimals: true },
  { code: 'USD', flag: '🇺🇸', symbol: '$', name: 'US Dollar' },
  { code: 'UYU', flag: '🇺🇾', symbol: '$U', name: 'Uruguayan Peso' },
  { code: 'UZS', flag: '🇺🇿', symbol: 'сўм', name: 'Uzbekistan Som' },
  { code: 'VES', flag: '🇻🇪', symbol: 'Bs.S', name: 'Venezuelan Bolívar' },
  { code: 'VND', flag: '🇻🇳', symbol: '₫', name: 'Vietnamese Dong', noDecimals: true },
  { code: 'VUV', flag: '🇻🇺', symbol: 'VT', name: 'Vanuatu Vatu', noDecimals: true },
  { code: 'WST', flag: '🇼🇸', symbol: 'WS$', name: 'Samoan Tala' },
  { code: 'XAF', flag: '🇨🇲', symbol: 'FCFA', name: 'CFA Franc BEAC', noDecimals: true },
  { code: 'XCD', flag: '🇦🇬', symbol: 'EC$', name: 'East Caribbean Dollar' },
  { code: 'XOF', flag: '🇸🇳', symbol: 'CFA', name: 'CFA Franc BCEAO', noDecimals: true },
  { code: 'XPF', flag: '🇵🇫', symbol: '₣', name: 'CFP Franc', noDecimals: true },
  { code: 'YER', flag: '🇾🇪', symbol: '﷼', name: 'Yemeni Rial' },
  { code: 'ZAR', flag: '🇿🇦', symbol: 'R', name: 'South African Rand' },
  { code: 'ZMW', flag: '🇿🇲', symbol: 'ZK', name: 'Zambian Kwacha' },
  { code: 'ZWL', flag: '🇿🇼', symbol: 'Z$', name: 'Zimbabwean Dollar' },
];

const currencyMap = new Map<string, CurrencyInfo>(
  ALL_CURRENCIES.map(c => [c.code, c])
);

export function getCurrencyInfo(code: string): CurrencyInfo {
  return currencyMap.get(code.toUpperCase()) ?? {
    code: code.toUpperCase(), flag: '💱', symbol: code.toUpperCase(), name: code.toUpperCase(),
  };
}

export const NO_DECIMAL_CURRENCIES = new Set(
  ALL_CURRENCIES.filter(c => c.noDecimals).map(c => c.code)
);

/** Currencies supported by Xendit for invoice creation */
export const XENDIT_SUPPORTED_CURRENCIES = new Set([
  'IDR', 'PHP', 'THB', 'VND', 'MYR', 'USD',
]);

/** Currencies supported by PayPal for orders */
export const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'ILS', 'INR', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP',
  'PLN', 'RUB', 'SEK', 'SGD', 'THB', 'TWD', 'USD',
]);

/** Union of all currencies supported by any payment provider (Xendit + PayPal) */
export const ALL_SUPPORTED_CURRENCIES = new Set([
  ...XENDIT_SUPPORTED_CURRENCIES,
  ...PAYPAL_SUPPORTED_CURRENCIES,
]);

/** Check if a currency is supported by a given payment provider */
export function isCurrencySupportedByProvider(currency: string, provider: string): boolean {
  const cur = currency.toUpperCase();
  if (provider === 'xendit') return XENDIT_SUPPORTED_CURRENCIES.has(cur);
  if (provider === 'paypal') return PAYPAL_SUPPORTED_CURRENCIES.has(cur);
  return true; // manual/unknown provider — no restriction
}

/** Get a human-readable warning if currency is not supported */
export function getCurrencyProviderWarning(currency: string, provider: string): string | null {
  if (!provider || provider === 'manual') return null;
  if (isCurrencySupportedByProvider(currency, provider)) return null;
  const providerName = provider === 'xendit' ? 'Xendit' : provider === 'paypal' ? 'PayPal' : provider;
  const supported = provider === 'xendit'
    ? Array.from(XENDIT_SUPPORTED_CURRENCIES).join(', ')
    : Array.from(PAYPAL_SUPPORTED_CURRENCIES).join(', ');
  return `${providerName} tidak mendukung mata uang ${currency}. Mata uang yang didukung: ${supported}`;
}
