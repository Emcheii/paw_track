const express = require("express");

const {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    uploadProfileImage
} = require("../controllers/profile.controller");
const { uploadProfileImage: uploadProfileImageMiddleware } = require("../middleware/upload.middleware");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, getProfile);
router.put("/", requireAuth, updateProfile);
router.put("/password", requireAuth, changePassword);
router.delete("/", requireAuth, deleteAccount);
router.post("/image", requireAuth, uploadProfileImageMiddleware.single("profileImage"), uploadProfileImage);

module.exports = router;