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
