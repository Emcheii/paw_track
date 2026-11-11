
const bcrypt = require("bcryptjs");
const adminModel = require("../models/admin.model");
const adminActivityModel = require("../models/admin-activity.model");

async function logAdminActivity({
    actorUserId,
    targetUserId,
    activityType,
    description,
    username,
    ipAddress
}) {
    try {
        await adminActivityModel.createActivityLog({
            actorUserId,
            targetUserId,
            activityType,
            description,
            username,
            ipAddress
        });
    } catch (error) {
        // Activity logging should not interrupt a completed admin action.
        console.error("Admin activity logging error:", error);
    }
}

async function getUsers(req, res) {
    try {
        const users = await adminModel.getAllUsers();
        const statistics = await adminModel.getUserStatistics();

        return res.status(200).json({
            users,
            statistics
        });
    } catch (error) {
        console.error("Get users error:", error);

        return res.status(500).json({
            detail: "Unable to retrieve users."
        });
    }
}

async function createUser(req, res) {
    try {
        const {
            firstName,
            lastName,
            username,
            email,
            password
        } = req.body;

        if (
            !firstName?.trim() ||
            !lastName?.trim() ||
            !username?.trim() ||
            !email?.trim() ||
            !password
        ) {
            return res.status(400).json({
                detail: "All fields are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                detail: "Password must be at least 8 characters long."
            });
        }

        const existingUsername = await adminModel.findByUsername(username.trim());

        if (existingUsername) {
            return res.status(409).json({
                detail: "Username is already taken."
            });
        }

        const existingEmail = await adminModel.findByEmail(email.trim());

        if (existingEmail) {
            return res.status(409).json({
                detail: "Email is already registered."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const userId = await adminModel.createUser({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.trim(),
            email: email.trim(),
            passwordHash
        });

        await logAdminActivity({
            actorUserId: req.currentUser.id,
            targetUserId: userId,
            activityType: "account_created",
            description: "Admin created a user account.",
            username: username.trim(),
            ipAddress: req.ip || null
        });

        return res.status(201).json({
            message: "User account created successfully.",
            userId
        });
    } catch (error) {
        console.error("Create user error:", error);

        return res.status(500).json({
            detail: "Unable to create user account."
        });
    }
}

async function updateUserStatus(req, res) {
    try {
        const userId = Number(req.params.id);
        const { accountStatus } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                detail: "Invalid user ID."
            });
        }

        if (!["active", "inactive"].includes(accountStatus)) {
            return res.status(400).json({
                detail: "Invalid account status."
            });
        }

        const user = await adminModel.getUserById(userId);

        if (!user) {
            return res.status(404).json({
                detail: "User not found."
            });
        }

        if (user.role === "admin") {
            return res.status(403).json({
                detail: "Admin accounts cannot be deactivated here."
            });
        }

        await adminModel.updateAccountStatus(userId, accountStatus);

        const isActivation = accountStatus === "active";

        await logAdminActivity({
            actorUserId: req.currentUser.id,
            targetUserId: userId,
            activityType: isActivation
                ? "account_activated"
                : "account_deactivated",
            description: isActivation
                ? "Admin activated a user account."
                : "Admin deactivated a user account.",
            username: user.username,
            ipAddress: req.ip || null
        });

        return res.status(200).json({
            message: `User account ${accountStatus === "active" ? "activated" : "deactivated"} successfully.`
        });
    } catch (error) {
        console.error("Update user status error:", error);

        return res.status(500).json({
            detail: "Unable to update account status."
        });
    }
}

module.exports = {
    getUsers,
    createUser,
    updateUserStatus
};