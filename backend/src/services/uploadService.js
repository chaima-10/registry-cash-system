const cloudinary = require('../config/cloudinary');

class UploadService {
    async uploadImage(file, folder) {
        if (!file) return null;
        
        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.log('Cloudinary not configured, skipping image upload');
            return null;
        }
        
        try {
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
                folder: folder,
            });
            return uploadResponse.secure_url;
        } catch (error) {
            console.error('Cloudinary upload failed:', error.message);
            return null;
        }
    }
}

module.exports = new UploadService();
