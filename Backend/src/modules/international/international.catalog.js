"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INTERNATIONAL COUNTRIES & MULTILINGUAL CATALOG
50 Supported Countries Across 5 Global Regions + 10 Languages
LOCATION: Backend/src/modules/international/international.catalog.js
COMMONJS ONLY
====================================================
*/

const SUPPORTED_LANGUAGES = Object.freeze([
    { code: "en", name: "English", nativeName: "English", dir: "ltr", flag: "🇬🇧", region: "Global" },
    { code: "fr", name: "French", nativeName: "Français", dir: "ltr", flag: "🇫🇷", region: "Europe / Africa" },
    { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr", flag: "🇪🇸", region: "Europe / Americas" },
    { code: "pt", name: "Portuguese", nativeName: "Português", dir: "ltr", flag: "🇵🇹", region: "Europe / Americas / Africa" },
    { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl", flag: "🇸🇦", region: "Middle East / North Africa" },
    { code: "sw", name: "Swahili", nativeName: "Kiswahili", dir: "ltr", flag: "🇰🇪", region: "East Africa" },
    { code: "tw", name: "Twi (Akan)", nativeName: "Twi (Akan)", dir: "ltr", flag: "🇬🇭", region: "West Africa" },
    { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr", flag: "🇩🇪", region: "Europe" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr", flag: "🇮🇳", region: "South Asia" },
    { code: "zh", name: "Chinese (Simplified)", nativeName: "中文", dir: "ltr", flag: "🇨🇳", region: "East Asia" }
]);

const SUPPORTED_COUNTRIES = Object.freeze([
    // AFRICA (18)
    {
        code: "GH", name: "Ghana", region: "Africa", flag: "🇬🇭", dialCode: "+233",
        currencyCode: "GHS", currencySymbol: "₵", defaultLanguage: "en", timezone: "Africa/Accra",
        nationalIdLabel: "Ghana Card", healthInsuranceScheme: "NHIS / NHIA", emergencyNumber: "112 / 193",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "NG", name: "Nigeria", region: "Africa", flag: "🇳🇬", dialCode: "+234",
        currencyCode: "NGN", currencySymbol: "₦", defaultLanguage: "en", timezone: "Africa/Lagos",
        nationalIdLabel: "NIN (National ID)", healthInsuranceScheme: "NHIA Nigeria", emergencyNumber: "112",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "KE", name: "Kenya", region: "Africa", flag: "🇰🇪", dialCode: "+254",
        currencyCode: "KES", currencySymbol: "KSh", defaultLanguage: "sw", timezone: "Africa/Nairobi",
        nationalIdLabel: "Kenya National ID", healthInsuranceScheme: "SHA / NHIF", emergencyNumber: "999 / 112",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "ZA", name: "South Africa", region: "Africa", flag: "🇿🇦", dialCode: "+27",
        currencyCode: "ZAR", currencySymbol: "R", defaultLanguage: "en", timezone: "Africa/Johannesburg",
        nationalIdLabel: "SA ID Number", healthInsuranceScheme: "NHI / Medical Aid", emergencyNumber: "10177 / 112",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "EG", name: "Egypt", region: "Africa", flag: "🇪🇬", dialCode: "+20",
        currencyCode: "EGP", currencySymbol: "E£", defaultLanguage: "ar", timezone: "Africa/Cairo",
        nationalIdLabel: "Egyptian National ID", healthInsuranceScheme: "Universal Health Insurance (UHIS)", emergencyNumber: "123",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "MA", name: "Morocco", region: "Africa", flag: "🇲🇦", dialCode: "+212",
        currencyCode: "MAD", currencySymbol: "MAD", defaultLanguage: "ar", timezone: "Africa/Casablanca",
        nationalIdLabel: "CIN (Carte Nationale)", healthInsuranceScheme: "AMO / CNSS", emergencyNumber: "15 / 150",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "ET", name: "Ethiopia", region: "Africa", flag: "🇪🇹", dialCode: "+251",
        currencyCode: "ETB", currencySymbol: "Br", defaultLanguage: "en", timezone: "Africa/Addis_Ababa",
        nationalIdLabel: "Fayda National ID", healthInsuranceScheme: "CBHI / EHIS", emergencyNumber: "907",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "TZ", name: "Tanzania", region: "Africa", flag: "🇹🇿", dialCode: "+255",
        currencyCode: "TZS", currencySymbol: "TSh", defaultLanguage: "sw", timezone: "Africa/Dar_es_Salaam",
        nationalIdLabel: "NIDA Number", healthInsuranceScheme: "NHIF Tanzania", emergencyNumber: "112 / 114",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "UG", name: "Uganda", region: "Africa", flag: "🇺🇬", dialCode: "+256",
        currencyCode: "UGX", currencySymbol: "USh", defaultLanguage: "en", timezone: "Africa/Kampala",
        nationalIdLabel: "NIN (NIRA)", healthInsuranceScheme: "National Health Insurance", emergencyNumber: "911 / 112",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "RW", name: "Rwanda", region: "Africa", flag: "🇷🇼", dialCode: "+250",
        currencyCode: "RWF", currencySymbol: "FRw", defaultLanguage: "fr", timezone: "Africa/Kigali",
        nationalIdLabel: "Rwanda National ID", healthInsuranceScheme: "Mutuelle de Santé / RSSB", emergencyNumber: "912",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "SN", name: "Senegal", region: "Africa", flag: "🇸🇳", dialCode: "+221",
        currencyCode: "XOF", currencySymbol: "CFA", defaultLanguage: "fr", timezone: "Africa/Dakar",
        nationalIdLabel: "CNI Senegal", healthInsuranceScheme: "CMU / IPM", emergencyNumber: "15 / 1515",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "CI", name: "Côte d'Ivoire", region: "Africa", flag: "🇨🇮", dialCode: "+225",
        currencyCode: "XOF", currencySymbol: "CFA", defaultLanguage: "fr", timezone: "Africa/Abidjan",
        nationalIdLabel: "CNI Ivoirienne", healthInsuranceScheme: "CMU Côte d'Ivoire", emergencyNumber: "185",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "CM", name: "Cameroon", region: "Africa", flag: "🇨🇲", dialCode: "+237",
        currencyCode: "XAF", currencySymbol: "FCFA", defaultLanguage: "fr", timezone: "Africa/Douala",
        nationalIdLabel: "CNI Cameroon", healthInsuranceScheme: "CSU / CNPS", emergencyNumber: "119",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "ZM", name: "Zambia", region: "Africa", flag: "🇿🇲", dialCode: "+260",
        currencyCode: "ZMW", currencySymbol: "ZK", defaultLanguage: "en", timezone: "Africa/Lusaka",
        nationalIdLabel: "NRC Number", healthInsuranceScheme: "NHIMA Zambia", emergencyNumber: "992",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "ZW", name: "Zimbabwe", region: "Africa", flag: "🇿🇼", dialCode: "+263",
        currencyCode: "USD", currencySymbol: "$", defaultLanguage: "en", timezone: "Africa/Harare",
        nationalIdLabel: "National ID", healthInsuranceScheme: "Medical Aid Societies", emergencyNumber: "994 / 999",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "BW", name: "Botswana", region: "Africa", flag: "🇧🇼", dialCode: "+267",
        currencyCode: "BWP", currencySymbol: "P", defaultLanguage: "en", timezone: "Africa/Gaborone",
        nationalIdLabel: "Omang ID", healthInsuranceScheme: "BPOMAS / Medical Aid", emergencyNumber: "997",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "NA", name: "Namibia", region: "Africa", flag: "🇳🇦", dialCode: "+264",
        currencyCode: "NAD", currencySymbol: "N$", defaultLanguage: "en", timezone: "Africa/Windhoek",
        nationalIdLabel: "Namibian ID", healthInsuranceScheme: "PSEMAS / Medical Aid", emergencyNumber: "10111",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "MU", name: "Mauritius", region: "Africa", flag: "🇲🇺", dialCode: "+230",
        currencyCode: "MUR", currencySymbol: "₨", defaultLanguage: "en", timezone: "Indian/Mauritius",
        nationalIdLabel: "NIC Mauritius", healthInsuranceScheme: "Public Health / Private Insurance", emergencyNumber: "114",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },

    // EUROPE (10)
    {
        code: "GB", name: "United Kingdom", region: "Europe", flag: "🇬🇧", dialCode: "+44",
        currencyCode: "GBP", currencySymbol: "£", defaultLanguage: "en", timezone: "Europe/London",
        nationalIdLabel: "NHS Number", healthInsuranceScheme: "NHS / Private PMI", emergencyNumber: "999 / 111",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "DE", name: "Germany", region: "Europe", flag: "🇩🇪", dialCode: "+49",
        currencyCode: "EUR", currencySymbol: "€", defaultLanguage: "de", timezone: "Europe/Berlin",
        nationalIdLabel: "eGK Versichertennummer", healthInsuranceScheme: "GKV / PKV", emergencyNumber: "112",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "FR", name: "France", region: "Europe", flag: "🇫🇷", dialCode: "+33",
        currencyCode: "EUR", currencySymbol: "€", defaultLanguage: "fr", timezone: "Europe/Paris",
        nationalIdLabel: "Numéro de Sécurité Sociale (Carte Vitale)", healthInsuranceScheme: "Assurance Maladie / Mutuelle", emergencyNumber: "15 / 112",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "ES", name: "Spain", region: "Europe", flag: "🇪🇸", dialCode: "+34",
        currencyCode: "EUR", currencySymbol: "€", defaultLanguage: "es", timezone: "Europe/Madrid",
        nationalIdLabel: "DNI / NIE / SIP", healthInsuranceScheme: "SNS / Seguro Privado", emergencyNumber: "112",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "IT", name: "Italy", region: "Europe", flag: "🇮🇹", dialCode: "+39",
        currencyCode: "EUR", currencySymbol: "€", defaultLanguage: "en", timezone: "Europe/Rome",
        nationalIdLabel: "Codice Fiscale / Tessera Sanitaria", healthInsuranceScheme: "SSN", emergencyNumber: "112 / 118",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "NL", name: "Netherlands", region: "Europe", flag: "🇳🇱", dialCode: "+31",
        currencyCode: "EUR", currencySymbol: "€", defaultLanguage: "en", timezone: "Europe/Amsterdam",
        nationalIdLabel: "BSN (Burgerservicenummer)", healthInsuranceScheme: "Zorgverzekering (Zvw)", emergencyNumber: "112",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "CH", name: "Switzerland", region: "Europe", flag: "🇨🇭", dialCode: "+41",
        currencyCode: "CHF", currencySymbol: "CHF", defaultLanguage: "de", timezone: "Europe/Zurich",
        nationalIdLabel: "AHV / AVS Number", healthInsuranceScheme: "OKP / LAMal", emergencyNumber: "144",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "SE", name: "Sweden", region: "Europe", flag: "🇸🇪", dialCode: "+46",
        currencyCode: "SEK", currencySymbol: "kr", defaultLanguage: "en", timezone: "Europe/Stockholm",
        nationalIdLabel: "Personnummer", healthInsuranceScheme: "Swedish National Health", emergencyNumber: "112",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "IE", name: "Ireland", region: "Europe", flag: "🇮🇪", dialCode: "+353",
        currencyCode: "EUR", currencySymbol: "€", defaultLanguage: "en", timezone: "Europe/Dublin",
        nationalIdLabel: "PPS Number", healthInsuranceScheme: "HSE / VHI / Laya", emergencyNumber: "112 / 999",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "PT", name: "Portugal", region: "Europe", flag: "🇵🇹", dialCode: "+351",
        currencyCode: "EUR", currencySymbol: "€", defaultLanguage: "pt", timezone: "Europe/Lisbon",
        nationalIdLabel: "Número de Utente SNS", healthInsuranceScheme: "SNS / ADSE", emergencyNumber: "112",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },

    // AMERICAS (8)
    {
        code: "US", name: "United States", region: "Americas", flag: "🇺🇸", dialCode: "+1",
        currencyCode: "USD", currencySymbol: "$", defaultLanguage: "en", timezone: "America/New_York",
        nationalIdLabel: "Patient ID / SSN (Last 4)", healthInsuranceScheme: "Medicare / Medicaid / PPO / HMO", emergencyNumber: "911",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "CA", name: "Canada", region: "Americas", flag: "🇨🇦", dialCode: "+1",
        currencyCode: "CAD", currencySymbol: "C$", defaultLanguage: "en", timezone: "America/Toronto",
        nationalIdLabel: "Provincial Health Card", healthInsuranceScheme: "Medicare Canada (OHIP/RAMQ/MSP)", emergencyNumber: "911",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "BR", name: "Brazil", region: "Americas", flag: "🇧🇷", dialCode: "+55",
        currencyCode: "BRL", currencySymbol: "R$", defaultLanguage: "pt", timezone: "America/Sao_Paulo",
        nationalIdLabel: "CPF / Cartão SUS", healthInsuranceScheme: "SUS / Convênio", emergencyNumber: "192",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "MX", name: "Mexico", region: "Americas", flag: "🇲🇽", dialCode: "+52",
        currencyCode: "MXN", currencySymbol: "MX$", defaultLanguage: "es", timezone: "America/Mexico_City",
        nationalIdLabel: "CURP", healthInsuranceScheme: "IMSS / ISSSTE / Seguro Privado", emergencyNumber: "911",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "CO", name: "Colombia", region: "Americas", flag: "🇨🇴", dialCode: "+57",
        currencyCode: "COP", currencySymbol: "COP$", defaultLanguage: "es", timezone: "America/Bogota",
        nationalIdLabel: "Cédula de Ciudadanía", healthInsuranceScheme: "EPS / SGSSS", emergencyNumber: "123",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "AR", name: "Argentina", region: "Americas", flag: "🇦🇷", dialCode: "+54",
        currencyCode: "ARS", currencySymbol: "ARS$", defaultLanguage: "es", timezone: "America/Argentina/Buenos_Aires",
        nationalIdLabel: "DNI", healthInsuranceScheme: "Obra Social / Prepaga", emergencyNumber: "107",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "JM", name: "Jamaica", region: "Americas", flag: "🇯🇲", dialCode: "+1-876",
        currencyCode: "JMD", currencySymbol: "J$", defaultLanguage: "en", timezone: "America/Jamaica",
        nationalIdLabel: "TRN / National ID", healthInsuranceScheme: "NHF Jamaica / Private", emergencyNumber: "110",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "TT", name: "Trinidad and Tobago", region: "Americas", flag: "🇹🇹", dialCode: "+1-868",
        currencyCode: "TTD", currencySymbol: "TT$", defaultLanguage: "en", timezone: "America/Port_of_Spain",
        nationalIdLabel: "National ID Card", healthInsuranceScheme: "RHA / Private Health", emergencyNumber: "811",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },

    // MIDDLE EAST (6)
    {
        code: "AE", name: "United Arab Emirates", region: "Middle East", flag: "🇦🇪", dialCode: "+971",
        currencyCode: "AED", currencySymbol: "د.إ", defaultLanguage: "ar", timezone: "Asia/Dubai",
        nationalIdLabel: "Emirates ID", healthInsuranceScheme: "DHA / Daman / Private", emergencyNumber: "998",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "SA", name: "Saudi Arabia", region: "Middle East", flag: "🇸🇦", dialCode: "+966",
        currencyCode: "SAR", currencySymbol: "﷼", defaultLanguage: "ar", timezone: "Asia/Riyadh",
        nationalIdLabel: "National ID / Iqama", healthInsuranceScheme: "CHI / Cooperative Health", emergencyNumber: "997",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "QA", name: "Qatar", region: "Middle East", flag: "🇶🇦", dialCode: "+974",
        currencyCode: "QAR", currencySymbol: "QR", defaultLanguage: "ar", timezone: "Asia/Qatar",
        nationalIdLabel: "QID (Qatar ID)", healthInsuranceScheme: "HMC / Mandatory Health Insurance", emergencyNumber: "999",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "KW", name: "Kuwait", region: "Middle East", flag: "🇰🇼", dialCode: "+965",
        currencyCode: "KWD", currencySymbol: "KD", defaultLanguage: "ar", timezone: "Asia/Kuwait",
        nationalIdLabel: "Civil ID", healthInsuranceScheme: "MOH / Afya", emergencyNumber: "112",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "JO", name: "Jordan", region: "Middle East", flag: "🇯🇴", dialCode: "+962",
        currencyCode: "JOD", currencySymbol: "JD", defaultLanguage: "ar", timezone: "Asia/Amman",
        nationalIdLabel: "Jordan National Number", healthInsuranceScheme: "Civil Health Insurance (CHIP)", emergencyNumber: "911",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "OM", name: "Oman", region: "Middle East", flag: "🇴🇲", dialCode: "+968",
        currencyCode: "OMR", currencySymbol: "OMR", defaultLanguage: "ar", timezone: "Asia/Muscat",
        nationalIdLabel: "Civil ID / Resident Card", healthInsuranceScheme: "Dhamani / MOH", emergencyNumber: "9999",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },

    // ASIA-PACIFIC (8)
    {
        code: "IN", name: "India", region: "Asia-Pacific", flag: "🇮🇳", dialCode: "+91",
        currencyCode: "INR", currencySymbol: "₹", defaultLanguage: "hi", timezone: "Asia/Kolkata",
        nationalIdLabel: "ABHA Health ID / Aadhaar", healthInsuranceScheme: "Ayushman Bharat (PM-JAY) / TPA", emergencyNumber: "108 / 112",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "CN", name: "China", region: "Asia-Pacific", flag: "🇨🇳", dialCode: "+86",
        currencyCode: "CNY", currencySymbol: "¥", defaultLanguage: "zh", timezone: "Asia/Shanghai",
        nationalIdLabel: "Resident Identity Card", healthInsuranceScheme: "Basic Medical Insurance (NHSA)", emergencyNumber: "120",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "JP", name: "Japan", region: "Asia-Pacific", flag: "🇯🇵", dialCode: "+81",
        currencyCode: "JPY", currencySymbol: "¥", defaultLanguage: "en", timezone: "Asia/Tokyo",
        nationalIdLabel: "My Number / Health Insurance Card", healthInsuranceScheme: "NHI / Shakai Hoken", emergencyNumber: "119",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "SG", name: "Singapore", region: "Asia-Pacific", flag: "🇸🇬", dialCode: "+65",
        currencyCode: "SGD", currencySymbol: "S$", defaultLanguage: "en", timezone: "Asia/Singapore",
        nationalIdLabel: "NRIC / FIN", healthInsuranceScheme: "MediShield Life / MediSave", emergencyNumber: "995",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "AU", name: "Australia", region: "Asia-Pacific", flag: "🇦🇺", dialCode: "+61",
        currencyCode: "AUD", currencySymbol: "A$", defaultLanguage: "en", timezone: "Australia/Sydney",
        nationalIdLabel: "Medicare Number / IHI", healthInsuranceScheme: "Medicare Australia / Private", emergencyNumber: "000",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "NZ", name: "New Zealand", region: "Asia-Pacific", flag: "🇳🇿", dialCode: "+64",
        currencyCode: "NZD", currencySymbol: "NZ$", defaultLanguage: "en", timezone: "Pacific/Auckland",
        nationalIdLabel: "NHI Number", healthInsuranceScheme: "Te Whatu Ora / ACC", emergencyNumber: "111",
        paymentChannels: ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "MY", name: "Malaysia", region: "Asia-Pacific", flag: "🇲🇾", dialCode: "+60",
        currencyCode: "MYR", currencySymbol: "RM", defaultLanguage: "en", timezone: "Asia/Kuala_Lumpur",
        nationalIdLabel: "MyKad", healthInsuranceScheme: "MOH Malaysia / Private Panel", emergencyNumber: "999",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    },
    {
        code: "PH", name: "Philippines", region: "Asia-Pacific", flag: "🇵🇭", dialCode: "+63",
        currencyCode: "PHP", currencySymbol: "₱", defaultLanguage: "en", timezone: "Asia/Manila",
        nationalIdLabel: "PhilSys / PhilHealth ID", healthInsuranceScheme: "PhilHealth / HMO", emergencyNumber: "911",
        paymentChannels: ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER", "INSURANCE"]
    }
]);

const REGIONS = Object.freeze(["Africa", "Europe", "Americas", "Middle East", "Asia-Pacific"]);

function findCountryByCode(code) {
    if (!code) return null;
    const normalized = String(code).trim().toUpperCase();
    return SUPPORTED_COUNTRIES.find((c) => c.code === normalized) || null;
}

function findLanguageByCode(code) {
    if (!code) return null;
    const normalized = String(code).trim().toLowerCase();
    return SUPPORTED_LANGUAGES.find((l) => l.code === normalized) || null;
}

module.exports = {
    SUPPORTED_COUNTRIES,
    SUPPORTED_LANGUAGES,
    REGIONS,
    findCountryByCode,
    findLanguageByCode
};
