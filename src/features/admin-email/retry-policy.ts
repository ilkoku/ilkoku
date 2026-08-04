const exactSafeTemplates = new Set([
  "admin_test_email",
  "reader_comment_reply",
  "author_publisher_work_liked",
  "author_publisher_followed",
  "reader_favorite_work_new_chapter",
  "publisher_followed_author_published",
  "editor_work_recommendation",
  "second_editor_assignment",
  "publisher_contract_sent",
  "writer_daily_summary",
  "weekly_discovery_summary",
]);

const safePrefixes = [
  "author_editor_",
  "author_second_editor_",
  "first_editor_second_review_",
  "publisher_submission_",
] as const;

export function canSafelyRetryEmailTemplate(
  template: string,
) {
  return exactSafeTemplates.has(template)
    || safePrefixes.some((prefix) => template.startsWith(prefix));
}

export function emailRetryBlockedReason(
  template: string,
) {
  if (canSafelyRetryEmailTemplate(template)) {
    return null;
  }

  return "Bu şablon güvenlik bağlantısı veya süresi sınırlı içerik barındırabilir. İlgili kullanıcı, davet ya da şifre akışından yeniden oluşturulmalıdır.";
}
