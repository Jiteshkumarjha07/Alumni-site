import { imgbbApiKey } from './firebase-config';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to ImgBB and returns the download URL
 * @param file The file to upload
 * @param _path Ignored for ImgBB, kept for interface compatibility
 * @returns The download URL of the uploaded file
 */
export const uploadMedia = async (file: File): Promise<string | null> => {
    if (!file) return null;

    if (!imgbbApiKey || (imgbbApiKey as string) === "YOUR_IMGBB_API_KEY") {
        throw new Error("ImgBB API key is not configured.");
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (result.success) {
            return result.data.url;
        } else {
            throw new Error(result.error?.message || 'Image upload failed.');
        }
    } catch (error) {
        console.error("ImgBB Upload Error:", error);
        throw error;
    }
};

/**
 * Uploads a video to Firebase Storage and returns the download URL
 * @param file The video file to upload
 * @param path The storage path (e.g., 'chats/videos')
 * @returns The download URL of the uploaded video
 */
export const uploadVideo = async (file: File, path: string = 'videos'): Promise<string | null> => {
    if (!file) return null;

    try {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Firebase Storage Upload Error:", error);
        throw error;
    }
};
/**
 * Uploads a file to Firebase Storage and returns the download URL
 * @param file The file to upload
 * @param path The storage path (e.g., 'chats/files')
 * @returns The download URL of the uploaded file
 */
export const uploadFile = async (file: File, path: string = 'files'): Promise<string | null> => {
    if (!file) return null;

    try {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Firebase Storage Upload Error:", error);
        throw error;
    }
};

/**
 * Uploads an audio blob to Firebase Storage and returns the download URL
 */
export const uploadAudio = async (blob: Blob, path: string = 'audio'): Promise<string | null> => {
    if (!blob) return null;
    try {
        let extension = 'webm';
        if (blob.type.includes('mp4')) extension = 'mp4';
        else if (blob.type.includes('ogg')) extension = 'ogg';
        else if (blob.type.includes('wav')) extension = 'wav';
        else if (blob.type.includes('mpeg') || blob.type.includes('mp3')) extension = 'mp3';

        const storageRef = ref(storage, `${path}/${Date.now()}_voice.${extension}`);
        const snapshot = await uploadBytes(storageRef, blob, { contentType: blob.type || 'audio/webm' });
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Firebase Audio Upload Error:', error);
        throw error;
    }
};
