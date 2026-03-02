import { imgbbApiKey } from './firebase-config';

/**
 * Uploads a file to ImgBB and returns the download URL
 * @param file The file to upload
 * @param _path Ignored for ImgBB, kept for interface compatibility
 * @returns The download URL of the uploaded file
 */
export const uploadMedia = async (file: File, _path?: string): Promise<string | null> => {
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
