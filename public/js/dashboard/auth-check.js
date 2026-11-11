
document.addEventListener("DOMContentLoaded", async () => {
    const isAdminPage = window.location.pathname.endsWith("/admin.html");

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

        if (!user) {
            window.location.replace("/");
            return;
        }

        if (isAdminPage && user.role !== "admin") {
            window.location.replace("/pages/dashboard/overview.html");
            return;
        }

    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.replace("/");
    }
});
