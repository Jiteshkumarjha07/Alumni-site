export const VALID_EMAIL_DOMAINS = [
    'gmail.com',
    'yahoo.com',
    'yahoo.co.in',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'protonmail.com',
    'aol.com',
    'zoho.com',
    'zoho.in',
    'live.com',
    'msn.com',
    'yandex.com',
];

export const isAuthenticEmailDomain = (email: string): boolean => {
    if (!email || !email.includes('@')) return false;
    
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain) return false;
    
    // Check against standard valid domains
    if (VALID_EMAIL_DOMAINS.includes(domain)) return true;
    
    // Check against educational / organizational domains
    if (
        domain.endsWith('.edu') || 
        domain.endsWith('.ac.in') || 
        domain.endsWith('.edu.in') ||
        domain.endsWith('.org') ||
        domain.endsWith('.gov') ||
        domain.endsWith('.ernet.in')
    ) {
        return true;
    }

    return false;
};

/**
 * Validates an international phone number.
 * Expects '+' followed by 7–15 digits (e.g. +919876543210).
 */
export const isValidPhoneNumber = (phone: string): boolean => {
    if (!phone) return false;
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^\+[1-9]\d{6,14}$/.test(cleaned);
};

/**
 * Normalises a phone number by stripping spaces/dashes and ensuring '+' prefix.
 */
export const normalizePhone = (phone: string): string => {
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
};
