const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const uploadDirectory = path.join(
    __dirname,
    "../../public/uploads/profile"
);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        const uniqueName =
            `${crypto.randomUUID()}${extension}`;

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(
            new Error("Only JPG, PNG, and WebP images are allowed.")
        );
    }

    cb(null, true);
};

const uploadProfileImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});

module.exports = {
    uploadProfileImage
};