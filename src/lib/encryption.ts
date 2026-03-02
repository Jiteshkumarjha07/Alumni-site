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

// Decrypt message
export const decryptMessage = (encryptedText: string, secret: string): string => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, secret);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted ? decrypted : encryptedText;
    } catch (e) {
        console.error("Decryption failed:", e);
        return encryptedText;
    }
};
