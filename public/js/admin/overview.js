
document.addEventListener("DOMContentLoaded", () => {
    loadAdminOverview();
});

async function loadAdminOverview() {
    const totalUsersElement = document.getElementById("overviewTotalUsers");
    const activeUsersElement = document.getElementById("overviewActiveUsers");
    const inactiveUsersElement = document.getElementById("overviewInactiveUsers");

    try {
        const response = await fetch("/api/admin/users", {
            credentials: "include"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to load Admin statistics.");
        }

        const statistics = result.statistics || {};

        totalUsersElement.textContent = formatCount(statistics.total_users);
        activeUsersElement.textContent = formatCount(statistics.active_users);
        inactiveUsersElement.textContent = formatCount(statistics.inactive_users);

    } catch (error) {
        console.error("Admin overview error:", error);

        totalUsersElement.textContent = "—";
        activeUsersElement.textContent = "—";
        inactiveUsersElement.textContent = "—";
    }
}

function formatCount(value) {
    const count = Number(value);

    return Number.isFinite(count)
        ? count.toLocaleString()
        : "0";
}
