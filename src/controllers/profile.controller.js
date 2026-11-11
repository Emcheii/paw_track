const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores anything beyond 72 bytes

async function getProfile(req, res) {
    try {
        const user = await userModel.getUserById(req.session.userId);

        if (!user) {
            return res.status(404).json({
                detail: "User not found."
            });
        }

        // Never send the password hash to the browser
        const { password_hash, ...safeUser } = user;

        return res.status(200).json({
            user: safeUser
        });

    } catch (error) {
        console.error("Get profile error:", error);

        return res.status(500).json({
            detail: "Something went wrong while retrieving the profile."
        });
    }
}


async function updateProfile(req, res) {
    try {
        const {
            firstName,
            lastName,
            username,
            email
        } = req.body;

        if (!firstName || !lastName || !username || !email) {
            return res.status(400).json({
                detail: "All profile fields are required."
            });
        }

        const existingUser = await userModel.findByUsername(username);

        if (
            existingUser &&
            existingUser.id !== req.session.userId
        ) {
            return res.status(409).json({
                detail: "Username is already taken."
            });
        }

        const updated = await userModel.updateUser(
            req.session.userId,
            {
                firstName,
                lastName,
                username,
                email
            }
        );

        if (!updated) {
            return res.status(404).json({
                detail: "User not found."
            });
        }

        return res.status(200).json({
            message: "Profile updated successfully."
        });

    } catch (error) {
        console.error("Update profile error:", error);

        return res.status(500).json({
            detail: "Something went wrong while updating the profile."
        });
    }
}


async function changePassword(req, res) {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                detail: "All password fields are required."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                detail: "New password and confirmation do not match."
            });
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                detail: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
            });
        }

        if (newPassword.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({
                detail: `New password must be at most ${MAX_PASSWORD_LENGTH} characters long.`
            });
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({
                detail: "New password must be different from your current password."
            });
        }

        const user = await userModel.getUserById(req.session.userId);

        if (!user) {
            return res.status(404).json({
                detail: "User not found."
            });
        }

        const passwordMatch = await bcrypt.compare(
            currentPassword,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(400).json({
                detail: "Current password is incorrect.",
                field: "currentPassword"
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        const updated = await userModel.updatePassword(
            req.session.userId,
            newPasswordHash
        );

        if (!updated) {
            return res.status(404).json({
                detail: "User not found."
            });
        }

        return res.status(200).json({
            message: "Password changed successfully."
        });

    } catch (error) {
        console.error("Change password error:", error);

        return res.status(500).json({
            detail: "Something went wrong while changing the password."
        });
    }
}


async function deleteAccount(req, res) {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                detail: "Password is required."
            });
        }

        const user = await userModel.getUserById(
            req.session.userId
        );

        if (!user) {
            return res.status(404).json({
                detail: "User not found."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                detail: "Incorrect password."
            });
        }

        const deleted = await userModel.deleteUser(
            req.session.userId
        );

        if (!deleted) {
            return res.status(404).json({
                detail: "User not found."
            });
        }

        req.session.destroy((error) => {
            if (error) {
                console.error("Session destruction error:", error);

                return res.status(500).json({
                    detail: "Account deleted, but logout failed."
                });
            }

            res.clearCookie("connect.sid");

            return res.status(200).json({
                message: "Account deleted successfully."
            });
        });

    } catch (error) {
        console.error("Delete account error:", error);

        return res.status(500).json({
            detail: "Something went wrong while deleting the account."
        });
    }
}


async function uploadProfileImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                detail: "Profile image is required."
            });
        }

        const profileImage = `/uploads/profile/${req.file.filename}`;

        const updatedRows = await userModel.updateProfileImage(
            req.session.userId,
            profileImage
        );

        if (!updatedRows) {
            return res.status(404).json({
                detail: "User account not found."
            });
        }

        return res.status(200).json({
            message: "Profile image updated successfully.",
            profileImage
        });

    } catch (error) {
        console.error("Profile image upload error:", error);

        return res.status(500).json({
            detail: "Something went wrong while uploading the profile image."
        });
    }
}

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    uploadProfileImage,
    deleteAccount
};