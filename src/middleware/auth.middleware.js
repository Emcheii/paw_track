
const userModel = require("../models/user.model");

async function requireAuth(req, res, next) {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                detail: "Authentication required."
            });
        }

        const user = await userModel.getUserById(req.session.userId);

        if (!user || user.account_status !== "active") {
            req.session.destroy(() => {});

            return res.status(401).json({
                detail: "Your account is inactive or no longer available."
            });
        }

        req.currentUser = user;

        next();
    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(500).json({
            detail: "Unable to verify your account."
        });
    }
}

function requireAdmin(req, res, next) {
    if (!req.currentUser || req.currentUser.role !== "admin") {
        return res.status(403).json({
            detail: "Administrator access required."
        });
    }

    next();
}

module.exports = {
    requireAuth,
    requireAdmin
};