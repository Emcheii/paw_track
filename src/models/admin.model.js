const pool = require("../config/database");

async function getAllUsers() {
    const [rows] = await pool.execute(
        `SELECT
            id,
            first_name,
            last_name,
            username,
            email,
            role,
            account_status,
            created_at
         FROM users
         ORDER BY created_at DESC`
    );

    return rows;
}

async function getUserById(id) {
    const [rows] = await pool.execute(
        `SELECT
            id,
            first_name,
            last_name,
            username,
            email,
            role,
            account_status,
            created_at
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
}

async function createUser({
    firstName,
    lastName,
    username,
    email,
    passwordHash
}) {
    const [result] = await pool.execute(
        `INSERT INTO users (
            first_name,
            last_name,
            username,
            email,
            password_hash,
            role,
            account_status
        )
        VALUES (?, ?, ?, ?, ?, 'user', 'active')`,
        [
            firstName,
            lastName,
            username,
            email,
            passwordHash
        ]
    );

    return result.insertId;
}

async function updateAccountStatus(id, accountStatus) {
    const [result] = await pool.execute(
        `UPDATE users
         SET account_status = ?
         WHERE id = ?
         AND role = 'user'`,
        [accountStatus, id]
    );

    return result.affectedRows;
}

async function getUserStatistics() {
    const [rows] = await pool.execute(
        `SELECT
            COUNT(*) AS total_users,
            SUM(account_status = 'active') AS active_users,
            SUM(account_status = 'inactive') AS inactive_users
         FROM users
         WHERE role = 'user'`
    );

    return rows[0];
}

async function findByUsername(username) {
    const [rows] = await pool.execute(
        `SELECT id FROM users
         WHERE username = ?
         LIMIT 1`,
        [username]
    );

    return rows[0] || null;
}

async function findByEmail(email) {
    const [rows] = await pool.execute(
        `SELECT id FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
}

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateAccountStatus,
    getUserStatistics,
    findByUsername,
    findByEmail
};