
document.addEventListener("DOMContentLoaded", () => {
    initializeAdminTheme();
    initializeAdminLayout();
});

function initializeAdminTheme() {
    const savedTheme = localStorage.getItem("pawfood_theme") || "light";

    document.documentElement.setAttribute("data-theme", savedTheme);
}

async function initializeAdminLayout() {
    try {
        const response = await fetch("/api/profile", {
            credentials: "include"
        });

        if (!response.ok) {
            window.location.replace("/");
            return;
        }

        const result = await response.json();
        const user = result.user;

        if (!user || user.role !== "admin") {
            window.location.replace("/pages/dashboard/overview.html");
            return;
        }

        loadAdminProfile(user);
        setActiveAdminNavigation();
        setAdminPageTitle();
        initializeAdminSidebar();
        initializeAdminLogout();

    } catch (error) {
        console.error("Admin layout initialization failed:", error);
        console.error("Profile loading error:", error.message);
    }
}

function loadAdminProfile(user) {
    const nameElement = document.querySelector("[data-admin-user-name]");
    const emailElement = document.querySelector("[data-admin-user-email]");
    const imageElement = document.querySelector("[data-admin-user-avatar]");

    const fullName =
        `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`
        .trim();

    if (nameElement) {
        nameElement.textContent = fullName || user.username || "Administrator";
    }

    if (emailElement) {
        emailElement.textContent = user.email || "";
    }

    if (imageElement) {
        imageElement.src =
            user.profile_image ||
            user.profileImage ||
            "../../assets/images/default-avatar.png";

        imageElement.onerror = () => {
            imageElement.onerror = null;
            imageElement.src = "../../assets/images/default-avatar.png";
        };
    }
}

function setActiveAdminNavigation() {
    const currentPath = window.location.pathname.replace(/\/+$/, "");

    document.querySelectorAll("[data-admin-nav]").forEach(link => {
        const linkPath = new URL(link.href, window.location.origin)
            .pathname
            .replace(/\/+$/, "");

        const isActive = currentPath === linkPath;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

function setAdminPageTitle() {
    const activeLink = document.querySelector("[data-admin-nav].active");
    const titleElement = document.querySelector("[data-admin-page-title]");

    if (activeLink && titleElement) {
        titleElement.textContent =
            activeLink.dataset.pageTitle ||
            activeLink.textContent.trim();
    }
}

function initializeAdminSidebar() {
    const toggleButton = document.querySelector("[data-admin-sidebar-toggle]");
    const sidebar = document.querySelector(".admin-sidebar");

    if (!toggleButton || !sidebar) return;

    toggleButton.addEventListener("click", () => {
        sidebar.classList.toggle("open");

        const isOpen = sidebar.classList.contains("open");

        toggleButton.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", event => {
        if (
            window.innerWidth <= 640 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !toggleButton.contains(event.target)
        ) {
            sidebar.classList.remove("open");
            toggleButton.setAttribute("aria-expanded", "false");
        }
    });
}

function initializeAdminLogout() {
    document.querySelectorAll(".logout-btn").forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();

            button.disabled = true;

            try {
                const response = await fetch("/logout", {
                    method: "POST",
                    credentials: "include"
                });

                if (!response.ok) {
                    throw new Error("Unable to log out.");
                }

                window.location.replace("/");

            } catch (error) {
                console.error("Admin logout failed:", error);
                button.disabled = false;

                if (typeof Swal !== "undefined") {
                    Swal.fire({
                        icon: "error",
                        text: error.message
                    });
                } else {
                    alert(error.message);
                }
            }
        });
    });
}
