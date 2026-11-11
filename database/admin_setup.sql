USE paw_track;

ALTER TABLE users
ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
ADD COLUMN account_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active';

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_account_status ON users(account_status);