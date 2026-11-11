
USE paw_track;

CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,

    actor_user_id INT NULL,
    target_user_id INT NULL,

    activity_type ENUM(
        'login',
        'failed_login',
        'account_created',
        'account_activated',
        'account_deactivated'
    ) NOT NULL,

    description VARCHAR(255) NOT NULL,
    username VARCHAR(50) NULL,
    ip_address VARCHAR(45) NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_activity_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_activity_target
        FOREIGN KEY (target_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_actor (actor_user_id),
    INDEX idx_activity_date (created_at)
);
