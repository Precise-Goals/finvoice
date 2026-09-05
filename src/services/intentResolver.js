/**
 * FinVoice Multi-Lingual Financial Intent Resolution Engine
 * Handles precise intent classification (Income/Earnings vs Expenses/Spendings vs Savings),
 * Indian number parsing (lakh, crore, k), and multi-lingual keyword recognition (EN, HI, MR).
 */

// Comprehensive Regex Patterns for Inflow / Earnings / Income
const INCOME_KEYWORDS = [
  // English
  /\b(earn|earned|earning|earnings)\b/i,
  /\b(salary|salaries|stipend)\b/i,
  /\b(credited|credit|received|inflow)\b/i,
  /\b(got paid|paid me|payday)\b/i,
  /\b(bonus|dividend|commission|incentive)\b/i,
  /\b(freelance|client payment|consulting fee)\b/i,
  /\b(profit|revenue|turnover|gain)\b/i,
  /\b(cashback|refund|reimbursed|allowance)\b/i,
  /\b(sold|sale of)\b/i,
  /\b(won|prize money)\b/i,
  // Hindi
  /(कमाए|कमाया|कमाई|कमाती|कमाता)/,
  /(मिले|मिला|मिली|प्राप्त|वेतन|तनख्वाह)/,
  /(जमा हुए|क्रेडिट हुए|मुनाफा|फायदा|इनाम)/,
  // Marathi
  /(कमावले|कमावला|मिळाले|मिळाला|पगार|वेतन)/,
  /(जमा झाले|नफा|फायदा)/,
];

// Comprehensive Regex Patterns for Savings & Wealth Deposits
const SAVINGS_KEYWORDS = [
  /\b(saved|saving|savings)\b/i,
  /\b(deposit|deposited|fixed deposit|fd|rd)\b/i,
  /\b(invest|invested|investment|mutual fund|sip|stocks)\b/i,
  /\b(put in bank|added to savings)\b/i,
  /(बचत|बचाए|बचाया|निवेश|जमा किए)/,
  /(बचत केली|गुंतवणूक)/,
];

// Comprehensive Regex Patterns for Outflow / Expenses / Spendings
const EXPENSE_KEYWORDS = [
  /\b(spent|spend|spending)\b/i,
  /\b(paid|pay|paying)\b/i,
  /\b(bought|buy|buying|purchased|purchase)\b/i,
  /\b(cost|fee|bill|recharge|rent|emi)\b/i,
  /\b(gave|given|lost|loss)\b/i,
  /\b(ordered|shopping)\b/i,
  /(खर्च|खर्चे|खर्चा|दिए|दिया|खरीदा|खरीदी|भुगतान|बिल|गवाए)/,
  /(खर्च केले|दिले|भरले|विकत घेतले)/,
];

// Category Matchers
const CATEGORY_MATCHERS = {
  food: [
    /\b(food|grocery|groceries|dinner|lunch|breakfast|snacks|cafe|coffee|tea|restaurant|zomato|swiggy|meal|milk|vegetables|fruits|bread)\b/i,
    /(खाना|भोजन|राशन|नाश्ता|सब्जी|दूध|चाय|होटल|जेवण|भाजी)/,
  ],
  medical: [
    /\b(medical|medicine|medicines|pharmacy|doctor|hospital|clinic|tablets|pills|syrup|test|lab|dentist|health|treatment)\b/i,
    /(दवा|दवाइयों|अस्पताल|डॉक्टर|इलाज|बीमारी|औषध|रुग्णालय)/,
  ],
  education: [
    /\b(education|tuition|school|college|books|book|stationery|course|exam|coaching|class|fees|fee|notebook)\b/i,
    /(पढ़ाई|शिक्षा|स्कूल|कॉलेज|ट्यूशन|किताब|किताबें|पुस्तक|फीस|शाळा|पुस्तके)/,
  ],
  travel: [
    /\b(travel|cab|taxi|uber|ola|auto|bus|train|metro|flight|petrol|fuel|diesel|ticket|parking|toll)\b/i,
    /(पेट्रोल|डीजल|किराया|सफर|यात्रा|गाड़ी|तिकीट|प्रवास)/,
  ],
  shopping: [
    /\b(shopping|clothes|cloth|shirt|pant|jeans|dress|shoes|flipkart|amazon|myntra|mall|watch|gadget)\b/i,
    /(कपड़े|जूते|खरीदारी|खरेदी)/,
  ],
  utilities: [
    /\b(electricity|water|wifi|broadband|internet|recharge|cylinder|gas|maintenance|maid|rent)\b/i,
    /(बिजली|पानी|किराया|भाड़ा|सिलेंडर|वीज)/,
  ],
};

/**
 * Parses Indian number formats:
 * - "10 lakh" / "10 lac" / "10 लाख" -> 1,000,000
 * - "1.5 lakh" -> 150,000
 * - "2 crore" / "2 cr" / "2 करोड़" -> 20,000,000
 * - "50k" / "50 thousand" / "50 हजार" -> 50,000
 * - "₹450" / "Rs 450" / "450 rupees" -> 450
 */
export const extractNumericAmount = (text) => {
  if (!text) return 0;
  const clean = text.toLowerCase().trim();

  // 1. Check for crore / cr / करोड़
  const croreMatch = clean.match(/([\d,.]+)\s*(?:crore|crores|cr|करोड़)/i);
  if (croreMatch) {
    const val = parseFloat(croreMatch[1].replace(/,/g, ""));
    if (!isNaN(val)) return Math.round(val * 10000000);
  }

  // 2. Check for lakh / lac / lacs / लाख
  const lakhMatch = clean.match(/([\d,.]+)\s*(?:lakh|lakhs|lac|lacs|लाख)/i);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1].replace(/,/g, ""));
    if (!isNaN(val)) return Math.round(val * 100000);
  }

  // 3. Check for thousand / k / हजार / हज़ार
  const thousandMatch = clean.match(/([\d,.]+)\s*(?:thousand|thousands|k|हजार|हज़ार)/i);
  if (thousandMatch) {
    const val = parseFloat(thousandMatch[1].replace(/,/g, ""));
    if (!isNaN(val)) return Math.round(val * 1000);
  }

  // 4. Check for regular numbers (e.g. ₹500, Rs. 1500, 450 rupees)
  const numMatch = clean.match(/(?:(?:rs\.?|inr|₹|रुपये|रु)\s*)?([\d,]+(?:\.\d+)?)(?:\s*(?:rs\.?|inr|₹|rupees|रुपये|रु))?/i);
  if (numMatch) {
    // Find numeric token with digits
    const digits = numMatch[1].replace(/,/g, "");
    const val = parseFloat(digits);
    if (!isNaN(val) && val > 0) return Math.round(val);
  }

  return 0;
};

/**
 * Resolves category from text
 */
export const resolveCategory = (text) => {
  if (!text) return null;
  for (const [category, patterns] of Object.entries(CATEGORY_MATCHERS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return category;
      }
    }
  }
  return "others";
};

/**
 * Deterministic Intent Resolution
 * Classifies text into:
 * - "income": Positive cash inflow (earned, salary, bonus, freelance, profit, received)
 * - "savings": Wealth accumulation (saved, deposited, invested)
 * - "expense": Categorized outflow (food, medical, bills, etc.)
 * - "spending": General outflow
 * - "inquiry": Non-transaction inquiry
 */
export const resolveIntent = (text) => {
  if (!text || typeof text !== "string") {
    return { isTransaction: false, intent: "unknown" };
  }

  const trimmed = text.trim();

  // Check Inflow / Income / Earnings first
  for (const pattern of INCOME_KEYWORDS) {
    if (pattern.test(trimmed)) {
      const amount = extractNumericAmount(trimmed);
      return {
        isTransaction: true,
        intent: "income",
        direction: "inflow",
        isPositive: true,
        type: "income",
        category: null,
        amount,
        description: trimmed,
        confidence: 0.98,
      };
    }
  }

  // Check Savings / Wealth
  for (const pattern of SAVINGS_KEYWORDS) {
    if (pattern.test(trimmed)) {
      const amount = extractNumericAmount(trimmed);
      return {
        isTransaction: true,
        intent: "savings",
        direction: "inflow",
        isPositive: true,
        type: "savings",
        category: null,
        amount,
        description: trimmed,
        confidence: 0.96,
      };
    }
  }

  // Check Outflow / Expense / Spending
  for (const pattern of EXPENSE_KEYWORDS) {
    if (pattern.test(trimmed)) {
      const amount = extractNumericAmount(trimmed);
      const category = resolveCategory(trimmed);
      return {
        isTransaction: true,
        intent: "expense",
        direction: "outflow",
        isPositive: false,
        type: category === "others" ? "spending" : "expense",
        category: category === "others" ? null : category,
        amount,
        description: trimmed,
        confidence: 0.95,
      };
    }
  }

  // Check if text has both a category and an amount (e.g. "dinner 450", "medicine 300")
  const category = resolveCategory(trimmed);
  const amount = extractNumericAmount(trimmed);
  if (category && category !== "others" && amount > 0) {
    return {
      isTransaction: true,
      intent: "expense",
      direction: "outflow",
      isPositive: false,
      type: "expense",
      category,
      amount,
      description: trimmed,
      confidence: 0.9,
    };
  }

  // If there's an amount and action verb is ambiguous
  if (amount > 0) {
    return {
      isTransaction: true,
      intent: "spending",
      direction: "outflow",
      isPositive: false,
      type: "spending",
      category: null,
      amount,
      description: trimmed,
      confidence: 0.75,
    };
  }

  return {
    isTransaction: false,
    intent: "inquiry",
    direction: "neutral",
    isPositive: false,
    amount: 0,
    description: trimmed,
  };
};
