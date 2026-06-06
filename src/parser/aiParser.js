const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini Client
const apiKeyToUse = process.env.GEMINI_API_KEY;
console.log(`[🔑 API KEY CHECK] Using Gemini Key starting with: ${apiKeyToUse ? apiKeyToUse.substring(0, 10) : 'UNDEFINED'}`);
const ai = new GoogleGenAI({ apiKey: apiKeyToUse });

async function parseIntent(text) {
    if (!text || text.trim() === '') {
        return { action: 'ADD', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, vendor_email: '' };
    }

    const sanitizedText = text
        .replace(/<\|.*?\|>/g, '')
        .replace(/#{1,6}\s/g, '')
        .trim()
        .slice(0, 1000); // we only need caption/intent, no need for huge text

    // 🚀 ULTRA-FAST LOCAL BYPASS: Skip AI completely for simple requests
    const lower = sanitizedText.toLowerCase();
    
    // 1. Inquiry Check
    if (lower.includes('outstanding') || lower.includes('balance') || lower.includes('kitna baki hai') || lower.includes('dues') || lower.includes('hisaab')) {
        return { action: 'INQUIRY', inquiry_type: 'OUTSTANDING', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false };
    }
    // 2. Remove/Sold Check
    if (lower.includes('remove') || lower.includes('delete') || lower.includes('sold')) {
        return { action: 'REMOVE', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
    }
    // 3. Deactivate/Activate Check
    if (lower === 'deactivate' || lower === 'leave') {
        return { action: 'DEACTIVATE', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
    }
    if (lower === 'activate' || lower === 'available now' || lower === 'back to work') {
        return { action: 'ACTIVATE', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
    }
    // 4. Pure Numbers Add Check (If they just paste numbers with spaces/newlines)
    const justNumbersAndSpaces = sanitizedText.replace(/[\d\s,\-\*]/g, '');
    if (justNumbersAndSpaces === '' && /\d{10}/.test(sanitizedText)) {
        return { action: 'ADD', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
    }

    // Only if none of the simple rules match, we send it to Gemini AI for complex reading
    const DELIM_START = "==VENDOR_MSG_START==";
    const DELIM_END   = "==VENDOR_MSG_END==";

    const systemInstructions = `You are an intent classifier for a VIP mobile number vendor platform.
Your ONLY job is to parse the vendor message below and return a single JSON object extracting metadata.

OUTPUT SCHEMA (strictly follow this):
{
  "action": "ADD" | "REMOVE" | "MIXED" | "DEACTIVATE" | "ACTIVATE" | "INQUIRY" | "IGNORE",
  "inquiry_type": "OUTSTANDING" | "NUMBERS" | "ALL" | null,
  "vendorRate": "extracted global rate or price for the numbers if mentioned (e.g., '5000rs', '3000'). Default ''",
  "vendorDiscount": "percentage or amount explicitly mentioned as discount (e.g. '10%', '200 off'). Default ''",
  "readyToPort": "RTP" | "CRTP",
  "keepSpacing": boolean
}

CLASSIFICATION RULES:
- MIXED      - vendor explicitly mentions BOTH adding some numbers and removing/sold some numbers in the same message.
- ADD        - vendor is making numbers available for sale, sending an excel/csv, sending a list of numbers.
- REMOVE     - vendor says numbers are sold or removing from inventory
- DEACTIVATE - vendor is unavailable (out of station, on leave, not available, etc.)
- ACTIVATE   - vendor is available again (back to work, available now, etc.)
- INQUIRY    - vendor is asking a question about their account (outstanding amount, balance, pending payment, active numbers, "what my outstanding", "kitna baki hai", "dues", "hisaab").
- IGNORE     - casual chat, greetings, unrelated messages

EXTRACTION RULES:
- 'vendorRate': if message mentions a flat price at the end/top like "5000rs", "@ 200", extract it. Do NOT confuse price with discount.
- 'vendorDiscount': ONLY if message explicitly says "discount", "off", or "%" (e.g., "10% discount", "flat 20%").
- 'readyToPort': if message mentions "CRTP", use "CRTP". Otherwise use "RTP".
- 'keepSpacing': if message mentions "keep spacing", "same space", "with space", set to true. Otherwise false.
- 'inquiry_type': if action is INQUIRY, set this to "OUTSTANDING" (for balance/dues) or "NUMBERS" (for active numbers) or "ALL". Otherwise null.

Note: DO NOT extract any phone numbers. Only extract the intent and metadata.`;

    const prompt = `${systemInstructions}\n\n${DELIM_START}\n${sanitizedText}\n${DELIM_END}\n\nReturn only the JSON object.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                temperature: 0,
                responseMimeType: "application/json",
            }
        });

        const raw = response.text.trim();
        return JSON.parse(raw);
    } catch (err) {
        if (err.message && err.message.includes('429')) {
            console.log(`[⚠️ AI RATE LIMIT] Google Gemini is overwhelmed (429). Using offline fallback...`);
        } else {
            console.error(`[⚠️ AI ERROR] Intent Parse failed: ${err.message}. Using offline fallback...`);
        }
        // Fallback safely with basic regex if API is down or rate limited
        let lower = text.toLowerCase();
        if (lower.includes('outstanding') || lower.includes('balance') || lower.includes('kitna baki hai') || lower.includes('dues')) {
            return { action: 'INQUIRY', inquiry_type: 'OUTSTANDING', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false };
        } else if (lower.includes('remove') || lower.includes('delete') || lower.includes('sold')) {
            return { action: 'REMOVE', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
        } else if (lower.includes('deactivate') || lower.includes('leave')) {
            return { action: 'DEACTIVATE', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
        } else if (lower.includes('activate') || lower.includes('available')) {
            return { action: 'ACTIVATE', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
        } else if (/\d{10}/.test(text) || text.includes('add')) {
            // If it has 10 digit numbers, assume ADD
            return { action: 'ADD', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
        }
        
        return { action: 'IGNORE', vendorDiscount: '', readyToPort: 'RTP', keepSpacing: false, inquiry_type: null };
    }
}

async function generateReply(action, validCount, invalidNumbers, failedIds, unauthorizedIds, inquiryData) {
    // For fast replies on INQUIRY or DEACTIVATE, we don't need AI. Just hardcode them.
    if (action === 'DEACTIVATE') return "⏸️ Your numbers have been temporarily deactivated.";
    if (action === 'ACTIVATE') return "▶️ Your numbers are now available again.";
    
    if (action === 'INQUIRY' && inquiryData) {
        const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;
        const comb = inquiryData.combinedTotals;
        let reply = `📊 *Your Account Summary*\n👨‍💼 Vendor: ${inquiryData.vendorName}\n\n💵 *Payment Details:*\n`;
        reply += `• Total Paid: ${formatCurrency(comb.paid)}\n`;
        reply += `• Pending: ${formatCurrency(comb.pending)}\n`;
        reply += `• To Be Paid: ${formatCurrency(comb.toBePaid)}\n`;
        reply += `*Total Outstanding: ${formatCurrency(comb.balanceTotal)}*\n\n`;
        reply += `📱 *Active Numbers on Website:* ${inquiryData.activeNumbers || 0}`;
        return reply;
    }

    if (action === 'REMOVE') {
        let msg = validCount > 0 ? `✅ Removed ${validCount} numbers successfully.` : `❌ No numbers were removed.`;
        if (failedIds && failedIds.length > 0) msg += `\n⚠️ Not found or already sold:\n${failedIds.join(', ')}`;
        if (unauthorizedIds && unauthorizedIds.length > 0) msg += `\n⚠️ Not authorized to remove:\n${unauthorizedIds.join(', ')}`;
        return msg;
    }

    if (action === 'ADD') {
        // itemsToAdd is passed in place of validCount for ADD
        const itemsToAdd = validCount || [];
        const addedCount = itemsToAdd.length;

        if (addedCount === 0 && (!invalidNumbers || invalidNumbers.length === 0)) {
            return "❌ Koi valid numbers nahi mile.";
        }

        let reply = "";
        
        if (addedCount > 0) {
            reply += `✅ *Successfully Added (${addedCount}):*\n`;
            itemsToAdd.forEach(item => {
                let rateStr = item.rate ? `Rs. ${item.rate}` : `Rs. 0`;
                let discStr = item.discount && item.discount !== '0' ? `${item.discount}` : `0%`;
                if (!discStr.includes('%') && discStr !== '0%') discStr += '%';
                let finalDisplayNumber = (item.styledNumber || item.number).replace(/-/g, ' ').replace(/\*/g, '');
                reply += `${finalDisplayNumber} | ${rateStr} | ${discStr} | ${item.port}\n`;
            });
        }

        if (invalidNumbers && invalidNumbers.length > 0) {
            if (reply.length > 0) reply += `\n`;
            reply += `❌ *Not Added (Invalid 10-Digit Format):*\n`;
            invalidNumbers.forEach(inv => {
                reply += `• ${inv}\n`;
            });
        }

        return reply.trim();
    }

    return "⚠️ I didn't quite catch that. Please send a valid list of numbers or an excel file.";
}

module.exports = {
    parseIntent,
    generateReply
};