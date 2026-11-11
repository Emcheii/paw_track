
const bcrypt = require("bcryptjs");
const readline = require("readline");
const pool = require("../config/database");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function createAdmin() {
    try {
        console.log("\n=== Create Initial Admin Account ===\n");

        const firstName = (await ask("First name: ")).trim();
        const lastName = (await ask("Last name: ")).trim();
        const username = (await ask("Username: ")).trim();
        const email = (await ask("Email: ")).trim();
        const password = await ask("Password: ");

        if (!firstName || !lastName || !username || !email || !password) {
            throw new Error("All fields are required.");
        }

        if (password.length < 8) {
            throw new Error("Password must be at least 8 characters.");
        }

        const [existing] = await pool.execute(
            `SELECT id
             FROM users
             WHERE username = ? OR email = ?
             LIMIT 1`,
            [username, email]
        );

        if (existing.length > 0) {
            throw new Error("Username or email is already registered.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

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
            VALUES (?, ?, ?, ?, ?, 'admin', 'active')`,
            [
                firstName,
                lastName,
                username,
                email,
                passwordHash
            ]
        );

        console.log("\nAdmin account created successfully!");
        console.log(`Admin ID: ${result.insertId}`);
        console.log(`Username: ${username}`);
        console.log(`Email: ${email}`);
        console.log("Role: admin");
        console.log("Status: active");

    } catch (error) {
        console.error("\nAdmin creation failed:", error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

createAdmin();