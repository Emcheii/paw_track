
const express = require("express");

const {
    getUsers,
    createUser,
    updateUserStatus
} = require("../controllers/admin.controller");

const {
    requireAuth,
    requireAdmin
} = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/users", getUsers);
router.post("/users", createUser);
router.patch("/users/:id/status", updateUserStatus);

module.exports = router;
