const pool = require("../config/database");

async function createUser({
    firstName,
    lastName,
    username,
    email,
    passwordHash
}) {
    const [result] = await pool.execute(
        `INSERT INTO users (first_name, last_name, username, email, password_hash) VALUES (?, ?, ?, ?, ?)`,
        [firstName, lastName, username, email, passwordHash]
    );

    return result.insertId;
}

async function findByUsername(username) {
    const [rows] = await pool.execute(
        `SELECT * FROM users WHERE username = ? LIMIT 1`,
        [username]
    );

    return rows[0] || null;
}

async function findByEmail(email) {
    const [rows] = await pool.execute(
        `SELECT * FROM users WHERE email = ?`,
        [email]
    );

    return rows;
}

async function getUserById(id) {
    const [rows] = await pool.execute(
        `SELECT *
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
}

async function updateUser(
    id,
    {
        firstName,
        lastName,
        username,
        email
    }
) {
    const [result] = await pool.execute(
        `UPDATE users
         SET
            first_name = ?,
            last_name = ?,
            username = ?,
            email = ?
         WHERE id = ?`,
        [
            firstName,
            lastName,
            username,
            email,
            id
        ]
    );

    return result.affectedRows;
}

async function updatePassword(id, passwordHash) {
    const [result] = await pool.execute(
        `UPDATE users
         SET password_hash = ?
         WHERE id = ?`,
        [passwordHash, id]
    );

    return result.affectedRows;
}

async function updateProfileImage(id, profileImage) {
    const [result] = await pool.execute(
        `UPDATE users
         SET profile_image = ?
         WHERE id = ?`,
        [
            profileImage,
            id
        ]
    );

    return result.affectedRows;
}

async function deleteUser(id) {
    const [result] = await pool.execute(
        `DELETE FROM users
         WHERE id = ?`,
        [id]
    );

    return result.affectedRows;
}

module.exports = {
    createUser,
    findByUsername,
    findByEmail,
    getUserById,
    updateUser,
    updatePassword,
    updateProfileImage,
    deleteUser
};