
const adminActivityModel = require("../models/admin-activity.model");

async function getActivitySummary(req, res) {
    try {
        const summary = await adminActivityModel.getActivitySummary();

        return res.status(200).json({
            summary: {
                successful_logins: Number(summary.successful_logins || 0),
                failed_logins: Number(summary.failed_logins || 0),
                account_changes: Number(summary.account_changes || 0)
            }
        });
    } catch (error) {
        console.error("Get activity summary error:", error);

        return res.status(500).json({
            detail: "Unable to retrieve activity summary."
        });
    }
}

async function getActivityLogs(req, res) {
    try {
        const activityType = req.query.type || "all";
        const limit = req.query.limit || 100;

        const validTypes = [
            "all",
            "login",
            "failed_login",
            "account_change"
        ];

        if (!validTypes.includes(activityType)) {
            return res.status(400).json({
                detail: "Invalid activity filter."
            });
        }

        const activities = await adminActivityModel.getActivityLogs(
            activityType,
            limit
        );

        return res.status(200).json({
            activities
        });
    } catch (error) {
        console.error("Get activity logs error:", error);

        return res.status(500).json({
            detail: "Unable to retrieve activity logs."
        });
    }
}

module.exports = {
    getActivitySummary,
    getActivityLogs
};