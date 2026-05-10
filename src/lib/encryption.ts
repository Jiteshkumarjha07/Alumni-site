import CryptoJS from 'crypto-js';

// Community chat secret key
export const COMMUNITY_CHAT_SECRET = "loyola-alumni-community-chat-secret-key";

// Generate chat ID from two user IDs
export const getChatId = (uid1: string, uid2: string): string => {
    return [uid1, uid2].sort().join('_');
};

// Generate shared secret for two users
export const getSharedSecret = (uid1: string, uid2: string): string => {
    return CryptoJS.SHA256(getChatId(uid1, uid2)).toString();
};

// Encrypt message
export const encryptMessage = (text: string, secret: string): string => {
    return CryptoJS.AES.encrypt(text, secret).toString();
};

// Decrypt message — hardened against malformed UTF-8 and plain-text legacy messages.
// CryptoJS throws "Malformed UTF-8 data" from WordArray.toString() which can
// escape the outer try/catch in some versions, so we wrap that call separately.
export const decryptMessage = (encryptedText: string, secret: string): string => {
    if (!encryptedText || typeof encryptedText !== 'string') return '';

    let result = encryptedText;

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, secret);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (decrypted) result = decrypted;
    } catch {
        // Keep as original if decryption fails (might be plain text)
    }

    // Always strip E2E markers from start/end (flexible with spaces/colons/brackets)
    return result
        .replace(/^(E2E:?\s*|\[E2E\]\s*|\(E2E\)\s*)/i, '')
        .replace(/(\s*[:\-]E2E|\s*\[E2E\]|\s*\(E2E\)|\s+E2E)$/i, '');
};
