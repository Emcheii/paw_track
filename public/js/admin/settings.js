const ADMIN_THEME_KEY = "pawfood_theme";

document.addEventListener("DOMContentLoaded", () => {
    initializeThemeCards();
    loadAdminSettingsProfile();

    const saveButton = document.getElementById("saveProfileBtn");
    if (saveButton) {
        saveButton.addEventListener("click", handleAdminSaveProfile);
    }
});

/* ---------- Appearance ---------- */

function getSavedTheme() {
    try {
        return localStorage.getItem(ADMIN_THEME_KEY) || "light";
    } catch (error) {
        return "light";
    }
}

function applyAdminTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    try {
        localStorage.setItem(ADMIN_THEME_KEY, theme);
    } catch (error) {
        console.error("Unable to save theme:", error);
    }

    document.querySelectorAll("[data-theme-option]").forEach((card) => {
        const isActive = card.dataset.themeOption === theme;

        card.classList.toggle("active", isActive);
        card.setAttribute("aria-pressed", String(isActive));

        const check = card.querySelector(".admin-theme-check");
        if (check) {
            check.innerHTML = isActive
                ? '<i class="fa-solid fa-check"></i>'
                : "";
        }
    });
}

function initializeThemeCards() {
    applyAdminTheme(getSavedTheme());

    document.querySelectorAll("[data-theme-option]").forEach((card) => {
        card.addEventListener("click", () => {
            applyAdminTheme(card.dataset.themeOption);
        });
    });
}

/* ---------- Profile ---------- */

async function loadAdminSettingsProfile() {
    try {
        const response = await fetch("/api/profile", {
            credentials: "include"
        });

        const result = await response.json();

        if (!response.ok || !result.user) {
            throw new Error(result.detail || "Unable to load profile.");
        }

        const user = result.user;
        const firstName = user.first_name || "";
        const lastName = user.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();

        document.getElementById("firstName").value = firstName;
        document.getElementById("lastName").value = lastName;
        document.getElementById("username").value = user.username || "";
        document.getElementById("email").value = user.email || "";

        document.getElementById("profileDisplayName").textContent =
            fullName || user.username || "Administrator";

        document.getElementById("profileDisplayEmail").textContent =
            user.email || "";

    } catch (error) {
        console.error("Load admin settings profile error:", error);

        document.getElementById("profileDisplayName").textContent = "Admin";
        document.getElementById("profileDisplayEmail").textContent =
            "Profile unavailable";
    }
}

async function handleAdminSaveProfile() {
    const saveButton = document.getElementById("saveProfileBtn");

    const profileData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim()
    };

    saveButton.disabled = true;

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

        await Swal.fire({
            icon: "success",
            title: "Profile Updated",
            text: "Your profile was updated successfully.",
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false
        });

        await loadAdminSettingsProfile();

        // Refresh the sidebar name/email too
        if (typeof initializeAdminLayout === "function") {
            initializeAdminLayout();
        }

    } catch (error) {
        console.error("Save admin profile error:", error);

        await Swal.fire({
            icon: "error",
            title: "Connection Error",
            text: "Unable to connect to the server."
        });

    } finally {
        saveButton.disabled = false;
    }
}