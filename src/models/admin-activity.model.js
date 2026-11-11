
const pool = require("../config/database");

async function createActivityLog({
    actorUserId = null,
    targetUserId = null,
    activityType,
    description,
    username = null,
    ipAddress = null
}) {
    const [result] = await pool.execute(
        `INSERT INTO admin_activity_logs (
            actor_user_id,
            target_user_id,
            activity_type,
            description,
            username,
            ip_address
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            actorUserId,
            targetUserId,
            activityType,
            description,
            username,
            ipAddress
        ]
    );

    return result.insertId;
}

async function getActivitySummary() {
    const [rows] = await pool.execute(
        `SELECT
            SUM(activity_type = 'login') AS successful_logins,
            SUM(activity_type = 'failed_login') AS failed_logins,
            SUM(activity_type IN (
                'account_created',
                'account_activated',
                'account_deactivated'
            )) AS account_changes
         FROM admin_activity_logs`
    );

    return {
        successful_logins: Number(rows[0].successful_logins || 0),
        failed_logins: Number(rows[0].failed_logins || 0),
        account_changes: Number(rows[0].account_changes || 0)
    };
}

async function getActivityLogs(activityType = "all", limit = 100) {
    const validTypes = [
        "all",
        "login",
        "failed_login",
        "account_change"
    ];

    if (!validTypes.includes(activityType)) {
        throw new Error("Invalid activity type.");
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

    let query = `
        SELECT
            logs.id,
            logs.activity_type,
            logs.description,
            logs.username,
            logs.ip_address,
            logs.created_at,
            logs.actor_user_id,
            logs.target_user_id,
            actor.username AS actor_username,
            target.username AS target_username
        FROM admin_activity_logs AS logs
        LEFT JOIN users AS actor
            ON logs.actor_user_id = actor.id
        LEFT JOIN users AS target
            ON logs.target_user_id = target.id
    `;

    const params = [];

    if (activityType === "login" || activityType === "failed_login") {
        query += " WHERE logs.activity_type = ?";
        params.push(activityType);
    } else if (activityType === "account_change") {
        query += ` WHERE logs.activity_type IN (
            'account_created',
            'account_activated',
            'account_deactivated'
        )`;
    }

    query += " ORDER BY logs.created_at DESC LIMIT ?";
    params.push(safeLimit);

    const [rows] = await pool.execute(query, params);

    return rows;
}

module.exports = {
    createActivityLog,
    getActivitySummary,
    getActivityLogs
};