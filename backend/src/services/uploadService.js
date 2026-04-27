const cloudinary = require('../config/cloudinary');

class UploadService {
    async uploadImage(file, folder) {
        if (!file) return null;
        const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
            folder: folder,
        });
        return uploadResponse.secure_url;
    }
}

module.exports = new UploadService();
