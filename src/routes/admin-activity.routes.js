
const express = require("express");

const {
    getActivitySummary,
    getActivityLogs
} = require("../controllers/admin-activity.controller");

const {
    requireAuth,
    requireAdmin
} = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/summary", getActivitySummary);
router.get("/", getActivityLogs);

module.exports = router;