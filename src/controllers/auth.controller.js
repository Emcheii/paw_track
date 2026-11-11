
const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
const adminActivityModel = require("../models/admin-activity.model");

async function logLoginActivity({
    activityType,
    description,
    username = null,
    targetUserId = null,
    ipAddress = null
}) {
    try {
        await adminActivityModel.createActivityLog({
            actorUserId: null,
            targetUserId,
            activityType,
            description,
            username: username ? String(username).slice(0, 50) : null,
            ipAddress
        });
    } catch (error) {
        // Activity logging should not interrupt the login process.
        console.error("Login activity logging error:", error);
    }
}

async function loginUser(req, res) {
    try {
        const { login, password } = req.body;
        const ipAddress = req.ip || null;

        if (!login || !password) {
            return res.status(400).json({
                detail: "Username/email and password are required."
            });
        }

        let users;

        if (login.includes("@")) {
            users = await userModel.findByEmail(login);
        } else {
            const user = await userModel.findByUsername(login);
            users = user ? [user] : [];
        }

        for (const user of users) {
            const passwordMatch = await bcrypt.compare(
                password,
                user.password_hash
            );

            if (!passwordMatch) {
                continue;
            }

            if (user.account_status !== "active") {
                await logLoginActivity({
                    activityType: "failed_login",
                    description: "Login attempt blocked because the account is inactive.",
                    username: user.username,
                    targetUserId: user.id,
                    ipAddress
                });

                return res.status(403).json({
                    detail: "Your account is inactive. Please contact the administrator."
                });
            }

            req.session.userId = user.id;
            req.session.role = user.role;

            await logLoginActivity({
                activityType: "login",
                description: "User logged in successfully.",
                username: user.username,
                targetUserId: user.id,
                ipAddress
            });

            return res.status(200).json({
                message: "Login successful.",
                user: {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        }

        await logLoginActivity({
            activityType: "failed_login",
            description: "Login failed because the username/email or password was invalid.",
            username: login,
            ipAddress
        });

        return res.status(401).json({
            detail: "Invalid username/email or password."
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            detail: "Something went wrong while logging in."
        });
    }
}

async function logoutUser(req, res) {
    req.session.destroy((error) => {
        if (error) {
            console.error("Logout error:", error);

            return res.status(500).json({
                detail: "Unable to log out."
            });
        }

        res.clearCookie("connect.sid");

        return res.status(200).json({
            message: "Logout successful."
        });
    });
}

module.exports = {
    loginUser,
    logoutUser
};