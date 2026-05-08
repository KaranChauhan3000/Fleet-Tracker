const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Multer instance — memory storage, 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} originalname
 * @param {string} folder  e.g. "fleetpro/<cid>/vehicles/<vid>"
 * @returns {Promise<object>} Cloudinary upload result
 */
async function uploadToCloudinary(buffer, originalname, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', use_filename: true, unique_filename: true },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    const r = new Readable();
    r.push(buffer);
    r.push(null);
    r.pipe(stream);
  });
}

module.exports = { upload, uploadToCloudinary };
