document.addEventListener("DOMContentLoaded", () => {
    loadDashboardUser();
});

async function loadDashboardUser() {
    try {
        const response = await fetch("/api/profile");
        const result = await response.json();

        if (!response.ok) {
            console.error("Dashboard user error:", result.detail);
            return;
        }

        const user = result.user;

        const userName = document.getElementById("sidebarUserName");
        const userEmail = document.getElementById("sidebarUserEmail");

        if (userName) {
            userName.textContent =
                `${user.first_name} ${user.last_name}`;
        }

        if (userEmail) {
            userEmail.textContent = user.email;
        }

        const profileImage = document.getElementById("sidebarProfileImage");

        if (profileImage) {

            if (user.profile_image) {
                profileImage.src = user.profile_image;
            } else {
                profileImage.src =
                    "../../assets/images/default-avatar.png";
            }

        }

    } catch (error) {
        console.error("Load dashboard user error:", error);
    }
}