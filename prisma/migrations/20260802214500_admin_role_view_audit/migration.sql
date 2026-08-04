ALTER TABLE `AuditLog`
  MODIFY `action` ENUM(
    'register',
    'login',
    'logout',
    'password_changed',
    'password_reset_requested',
    'email_test_sent',
    'email_verified',
    'profile_updated',
    'role_requested',
    'role_request_reviewed',
    'work_created',
    'work_published',
    'ownership_stamp_created',
    'user_status_changed',
    'work_status_changed',
    'publisher_status_changed',
    'comment_status_changed',
    'reading_access_flagged',
    'admin_role_view_changed'
  ) NOT NULL;
