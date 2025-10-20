const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const logger = require('../utils/logger');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadType = req.path.includes('image') ? 'images' : 'audio';
        const uploadPath = path.join(uploadsDir, uploadType);
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    }
});

// Configure multer with limits
const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1 // Single file upload
    }
});

// POST /api/upload/image - Upload image file (admin only)
router.post('/image', auth, adminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        const fileUrl = `/uploads/images/${req.file.filename}`;
        
        logger.info(`Image uploaded: ${req.file.filename} by ${req.user.email}`);
        
        res.json({
            message: 'Image uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                url: fileUrl
            }
        });
        
    } catch (error) {
        logger.error('Image upload error:', error);
        res.status(500).json({ error: error.message || 'Upload failed' });
    }
});

module.exports = router;