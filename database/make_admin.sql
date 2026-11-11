USE paw_track;

UPDATE users
SET role = 'admin',
    account_status = 'active'
WHERE username = 'YOUR_ADMIN_USERNAME';