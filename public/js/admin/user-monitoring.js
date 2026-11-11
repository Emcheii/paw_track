
const API_BASE_URL = "http://localhost:3000";

const summaryElements = {
    successfulLogins: document.getElementById("successfulLogins"),
    failedLogins: document.getElementById("failedLogins"),
    accountChanges: document.getElementById("accountChanges")
};

const activityTableBody = document.getElementById("activityTableBody");
const activityEmptyState = document.getElementById("activityEmptyState");
const activityTypeFilter = document.getElementById("activityTypeFilter");

async function fetchAdminActivity(endpoint) {
    const response = await fetch(`${API_BASE_URL}/api/admin/activity${endpoint}`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        }
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.detail || "Unable to retrieve activity records.");
    }

    return result;
}

function formatActivityType(type) {
    const labels = {
        login: "Successful Login",
        failed_login: "Failed Login",
        account_created: "Account Created",
        account_activated: "Account Activated",
        account_deactivated: "Account Deactivated"
    };

    return labels[type] || type;
}

function formatDate(dateValue) {
    if (!dateValue) return "N/A";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleString();
}

function createTableCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "N/A";
    return cell;
}

function renderActivities(activities) {
    activityTableBody.innerHTML = "";

    if (!activities || activities.length === 0) {
        activityEmptyState.hidden = false;
        return;
    }

    activityEmptyState.hidden = true;

    activities.forEach((activity) => {
        const row = document.createElement("tr");

        row.appendChild(createTableCell(formatActivityType(activity.activity_type)));
        row.appendChild(createTableCell(activity.actor_username || "System / Unknown"));
        row.appendChild(createTableCell(activity.target_username || activity.username || "N/A"));
        row.appendChild(createTableCell(activity.description));
        row.appendChild(createTableCell(formatDate(activity.created_at)));

        activityTableBody.appendChild(row);
    });
}

async function loadActivitySummary() {
    try {
        const result = await fetchAdminActivity("/summary");
        const summary = result.summary || {};

        summaryElements.successfulLogins.textContent =
            summary.successful_logins ?? 0;

        summaryElements.failedLogins.textContent =
            summary.failed_logins ?? 0;

        summaryElements.accountChanges.textContent =
            summary.account_changes ?? 0;
    } catch (error) {
        console.error("Activity summary error:", error);
    }
}

async function loadActivities() {
    try {
        const selectedType = activityTypeFilter.value;
        const query = `?type=${encodeURIComponent(selectedType)}`;

        const result = await fetchAdminActivity(query);

        renderActivities(result.activities || []);
    } catch (error) {
        console.error("Activity records error:", error);

        activityTableBody.innerHTML = "";
        activityEmptyState.hidden = false;
        activityEmptyState.textContent = error.message;
    }
}

activityTypeFilter.addEventListener("change", loadActivities);

async function initializeUserMonitoring() {
    await Promise.all([
        loadActivitySummary(),
        loadActivities()
    ]);
}

initializeUserMonitoring();