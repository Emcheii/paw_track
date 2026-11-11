document.addEventListener("DOMContentLoaded", () => {
    initializeUserManagement();
});

let adminUsers = [];

function initializeUserManagement() {
    document.getElementById("openCreateUserBtn")
        ?.addEventListener("click", openCreateUserModal);

    document.getElementById("closeCreateUserBtn")
        ?.addEventListener("click", closeCreateUserModal);

    document.getElementById("cancelCreateUserBtn")
        ?.addEventListener("click", closeCreateUserModal);

    document.getElementById("createUserForm")
        ?.addEventListener("submit", createUser);

    document.getElementById("userSearch")
        ?.addEventListener("input", renderUsers);

    document.getElementById("accountStatusFilter")
        ?.addEventListener("change", renderUsers);

    document.getElementById("createUserModal")
        ?.addEventListener("click", event => {
            if (event.target.id === "createUserModal") {
                closeCreateUserModal();
            }
        });

    loadUsers();
}

async function loadUsers() {
    const tableBody = document.getElementById("usersTableBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="admin-loading">
                Loading user accounts...
            </td>
        </tr>
    `;

    try {
        const response = await fetch("/api/admin/users", {
            credentials: "include"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to load user accounts.");
        }

        adminUsers = Array.isArray(result.users) ? result.users : [];

        updateUserStatistics(result.statistics || {});
        renderUsers();

    } catch (error) {
        console.error("Load users error:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="admin-loading">
                    Unable to load user accounts.
                </td>
            </tr>
        `;

        showMessage("error", error.message);
    }
}

function updateUserStatistics(statistics) {
    document.getElementById("totalUsers").textContent =
        formatNumber(statistics.total_users);

    document.getElementById("activeUsers").textContent =
        formatNumber(statistics.active_users);

    document.getElementById("inactiveUsers").textContent =
        formatNumber(statistics.inactive_users);
}

function renderUsers() {
    const tableBody = document.getElementById("usersTableBody");
    const emptyState = document.getElementById("usersEmptyState");

    const searchTerm = document.getElementById("userSearch")
        .value.trim().toLowerCase();

    const statusFilter = document.getElementById("accountStatusFilter").value;

    const filteredUsers = adminUsers.filter(user => {
        const fullName =
            `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase();

        const matchesSearch =
            fullName.includes(searchTerm) ||
            (user.username || "").toLowerCase().includes(searchTerm) ||
            (user.email || "").toLowerCase().includes(searchTerm);

        const matchesStatus =
            statusFilter === "all" ||
            user.account_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (filteredUsers.length === 0) {
        tableBody.innerHTML = "";
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    tableBody.innerHTML = filteredUsers.map(user => {
        const fullName = escapeHTML(
            `${user.first_name || ""} ${user.last_name || ""}`.trim()
        );

        const username = escapeHTML(user.username || "");
        const email = escapeHTML(user.email || "");
        const status = user.account_status;
        const createdAt = formatDate(user.created_at);
        const isAdmin = user.role === "admin";

        const statusBadge = status === "active"
            ? `<span class="admin-account-status active">Active</span>`
            : `<span class="admin-account-status inactive">Inactive</span>`;

        // Admin accounts are shown read-only: no activate/deactivate button
        const actionButton = isAdmin
            ? `<span class="admin-account-status active">Administrator</span>`
            : `
                <button
                    type="button"
                    class="admin-account-action ${status === "active" ? "deactivate" : "activate"}"
                    data-user-id="${Number(user.id)}"
                    data-next-status="${status === "active" ? "inactive" : "active"}"
                >
                    ${status === "active" ? "Deactivate" : "Activate"}
                </button>
            `;

        return `
            <tr>
                <td>${fullName}</td>
                <td>${username}</td>
                <td>${email}</td>
                <td>${createdAt}</td>
                <td>${statusBadge}</td>
                <td>${actionButton}</td>
            </tr>
        `;
    }).join("");

    tableBody.querySelectorAll("[data-user-id]").forEach(button => {
        button.addEventListener("click", () => {
            updateUserStatus(
                Number(button.dataset.userId),
                button.dataset.nextStatus
            );
        });
    });
}

function openCreateUserModal() {
    const modal = document.getElementById("createUserModal");

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
}

function closeCreateUserModal() {
    const modal = document.getElementById("createUserModal");

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

async function createUser(event) {
    event.preventDefault();

    const submitButton = document.getElementById("createUserSubmitBtn");

    const userData = {
        firstName: document.getElementById("newFirstName").value.trim(),
        lastName: document.getElementById("newLastName").value.trim(),
        username: document.getElementById("newUsername").value.trim(),
        email: document.getElementById("newEmail").value.trim(),
        password: document.getElementById("newPassword").value
    };

    submitButton.disabled = true;
    submitButton.textContent = "Creating...";

    try {
        const response = await fetch("/api/admin/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to create account.");
        }

        closeCreateUserModal();
        document.getElementById("createUserForm").reset();

        await loadUsers();

        showMessage("success", result.message || "User account created successfully.");

    } catch (error) {
        console.error("Create user error:", error);
        showMessage("error", error.message);

    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = `
            <i class="fa-solid fa-user-plus"></i>
            Create Account
        `;
    }
}

async function updateUserStatus(userId, accountStatus) {
    const action = accountStatus === "active" ? "activate" : "deactivate";

    const confirmation = await Swal.fire({
        title: `${accountStatus === "active" ? "Activate" : "Deactivate"} account?`,
        text: `Are you sure you want to ${action} this user account?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: `Yes, ${action}`,
        cancelButtonText: "Cancel",
        confirmButtonColor: accountStatus === "active" ? "#15803d" : "#dc2626"
    });

    if (!confirmation.isConfirmed) return;

    try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ accountStatus })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "Unable to update account status.");
        }

        await loadUsers();

        showMessage("success", result.message || "Account status updated.");

    } catch (error) {
        console.error("Update account status error:", error);
        showMessage("error", error.message);
    }
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString();
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function showMessage(icon, message) {
    if (typeof Swal !== "undefined") {
        Swal.fire({
            icon,
            text: message,
            confirmButtonColor: "#204e33"
        });
    } else {
        alert(message);
    }
}