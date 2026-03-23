import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file The file to upload (Image or Video)
 * @param path The path in storage (e.g., 'chats/chatId/filename')
 */
export async function uploadMedia(file: File, path: string): Promise<string> {
    try {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const storageRef = ref(storage, `${path}/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
    } catch (error) {
        console.error('Error uploading media:', error);
        throw error;
    }
}
