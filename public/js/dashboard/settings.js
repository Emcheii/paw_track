let selectedProfileImage = null;

const DEFAULT_AVATAR = "/assets/dog-index.png";

document.addEventListener("DOMContentLoaded", () => {
    loadProfile();

    document.getElementById("saveProfileBtn").addEventListener("click", handleSaveProfile);
    document.getElementById("deleteAccountBtn").addEventListener("click", handleDeleteAccount);
    document.getElementById("changePhotoBtn").addEventListener("click", handleChangePhoto);
    document.getElementById("profileImageInput").addEventListener("change", handleProfileImageChange);

    initializePasswordModal();
});

/* ---------- Profile ---------- */

async function loadProfile() {
    try {
        const response = await fetch("/api/profile", { credentials: "include" });
        const result = await response.json();

        if (!response.ok) {
            console.error("Profile error:", result.detail);
            return;
        }

        const user = result.user || {};
        const firstName = user.first_name || "";
        const lastName = user.last_name || "";

        document.getElementById("firstName").value = firstName;
        document.getElementById("lastName").value = lastName;
        document.getElementById("username").value = user.username || "";
        document.getElementById("email").value = user.email || "";

        document.getElementById("profileDisplayName").textContent =
            `${firstName} ${lastName}`.trim();
        document.getElementById("profileDisplayEmail").textContent = user.email || "";

        const profileImage = document.getElementById("profileImage");
        profileImage.src = user.profile_image || DEFAULT_AVATAR;

    } catch (error) {
        console.error("Load profile error:", error);
    }
}

async function handleSaveProfile() {
    const profileData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim()
    };

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(profileData)
        });

        const result = await response.json();

        if (!response.ok) {
            await Swal.fire({
                icon: "error",
                title: "Update Failed",
                text: result.detail || "Unable to update profile."
            });
            return;
        }

        if (selectedProfileImage) {
            const formData = new FormData();
            formData.append("profileImage", selectedProfileImage);

            const imageResponse = await fetch("/api/profile/image", {
                method: "POST",
                credentials: "include",
                body: formData
            });

            const imageResult = await imageResponse.json();

            if (!imageResponse.ok) {
                await Swal.fire({
                    icon: "error",
                    title: "Profile Image Upload Failed",
                    text: imageResult.detail || "Unable to upload profile image."
                });
                return;
            }

            selectedProfileImage = null;
        }

        await Swal.fire({
            icon: "success",
            title: "Profile Updated",
            text: "Your profile was updated successfully.",
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false
        });

        await loadProfile();

    } catch (error) {
        console.error("Save profile error:", error);

        await Swal.fire({
            icon: "error",
            title: "Connection Error",
            text: "Unable to connect to the server."
        });
    }
}

/* ---------- Change Password Modal ---------- */

function initializePasswordModal() {
    const modal = document.getElementById("changePasswordModal");
    const form = document.getElementById("changePasswordForm");

    document.getElementById("openPasswordModalBtn")
        .addEventListener("click", openPasswordModal);

    document.getElementById("closePasswordModalBtn")
        .addEventListener("click", closePasswordModal);

    document.getElementById("cancelPasswordBtn")
        .addEventListener("click", closePasswordModal);

    // Click on the dark backdrop closes the modal
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closePasswordModal();
        }
    });

    // Escape closes the modal (unless a SweetAlert is showing)
    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            modal.classList.contains("show") &&
            !document.querySelector(".swal2-container")
        ) {
            closePasswordModal();
        }
    });

    document.getElementById("showPasswords")
        .addEventListener("change", (event) => {
            const type = event.target.checked ? "text" : "password";

            ["currentPassword", "newPassword", "confirmPassword"].forEach((id) => {
                document.getElementById(id).type = type;
            });
        });

    form.addEventListener("submit", handleChangePassword);
}

function openPasswordModal() {
    const modal = document.getElementById("changePasswordModal");

    resetPasswordForm();

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    document.getElementById("currentPassword").focus();
}

function closePasswordModal() {
    const modal = document.getElementById("changePasswordModal");

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    resetPasswordForm();
}

function resetPasswordForm() {
    document.getElementById("changePasswordForm").reset();

    ["currentPassword", "newPassword", "confirmPassword"].forEach((id) => {
        document.getElementById(id).type = "password";
    });

    showPasswordError("");
}

function showPasswordError(message) {
    const errorBox = document.getElementById("passwordError");

    errorBox.textContent = message;
    errorBox.hidden = !message;
}

function showPasswordError(message, fieldId = null) {
    const errorBox = document.getElementById("passwordError");

    errorBox.textContent = message;
    errorBox.hidden = !message;

    ["currentPassword", "newPassword", "confirmPassword"].forEach((id) => {
        document.getElementById(id).classList.remove("input-error");
    });

    if (message && fieldId) {
        const field = document.getElementById(fieldId);

        field.classList.add("input-error");
        field.focus();
        field.select();
    }
}

async function handleChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const submitButton = document.getElementById("submitPasswordBtn");

    showPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
        showPasswordError("Please fill in all password fields.");
        return;
    }

    if (newPassword.length < 8) {
        showPasswordError(
            "Your new password must be at least 8 characters long.",
            "newPassword"
        );
        return;
    }

    if (newPassword !== confirmPassword) {
        showPasswordError(
            "The new password and confirmation do not match.",
            "confirmPassword"
        );
        return;
    }

    if (newPassword === currentPassword) {
        showPasswordError(
            "Your new password must be different from your current password.",
            "newPassword"
        );
        return;
    }

    submitButton.disabled = true;

    let response;

    try {
        response = await fetch("/api/profile/password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword
            })
        });
    } catch (error) {
        // The request itself failed: server is down or unreachable
        console.error("Change password network error:", error);
        showPasswordError(
            "Unable to connect to the server. Please check your connection and try again."
        );
        submitButton.disabled = false;
        return;
    }

    // The reply may not be JSON (for example an HTML error page)
    let result = {};

    try {
        result = await response.json();
    } catch (error) {
        result = {};
    }

    submitButton.disabled = false;

    if (response.status === 401) {
        // Session ended or account deactivated
        window.location.replace("/");
        return;
    }

    if (!response.ok) {
        // Technical details go to the console for the developer only
        console.error(
            `Change password failed: HTTP ${response.status}`,
            result
        );

        if (result.detail) {
            // Messages written by the server are meant for the user
            const fieldId = result.field || null;
            showPasswordError(result.detail, fieldId);
        } else {
            showPasswordError(
                "We couldn't update your password right now. Please try again later."
            );
        }

        return;
    }

    closePasswordModal();

    await Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "Your password was changed successfully.",
        timer: 1800,
        timerProgressBar: true,
        showConfirmButton: false
    });
}

/* ---------- Delete Account ---------- */

async function handleDeleteAccount() {
    const confirmation = await Swal.fire({
        icon: "warning",
        title: "Delete Account?",
        text: "This action cannot be undone.",
        input: "password",
        inputLabel: "Enter your current password",
        inputPlaceholder: "Your password",
        inputAttributes: {
            autocapitalize: "off",
            autocorrect: "off"
        },
        showCancelButton: true,
        confirmButtonText: "Delete Account",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#d9534f",
        inputValidator: (value) => {
            if (!value) {
                return "Password is required.";
            }
        }
    });

    if (!confirmation.isConfirmed) {
        return;
    }

    try {
        const response = await fetch("/api/profile", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ password: confirmation.value })
        });

        const result = await response.json();

        if (!response.ok) {
            await Swal.fire({
                icon: "error",
                title: "Delete Failed",
                text: result.detail || "Unable to delete your account."
            });
            return;
        }

        await Swal.fire({
            icon: "success",
            title: "Account Deleted",
            text: "Your account has been permanently deleted.",
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false
        });

        window.location.href = "/";

    } catch (error) {
        console.error("Delete account error:", error);

        await Swal.fire({
            icon: "error",
            title: "Connection Error",
            text: "Unable to connect to the server."
        });
    }
}

/* ---------- Profile Photo ---------- */

function handleChangePhoto() {
    document.getElementById("profileImageInput").click();
}

function handleProfileImageChange(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    selectedProfileImage = file;

    const image = document.getElementById("profileImage");
    image.src = URL.createObjectURL(file);
}