export const notificationContent = {
  loading: "Yükleniyor",
  request: {
    submit: "Talebi Oluştur",
    ready: "Talep hazırlandı",
    done: "Tamam",
  },
  verificationSent:
    "Doğrulama bağlantısını e-posta adresine gönderdik. Gelen kutunu kontrol et.",
  passwordResetSent:
    "Hesap varsa şifre yenileme bağlantısı e-posta adresine gönderildi.",
  editorRoleRequested:
    "Editör rolü talebin alındı. Yönetici onayından sonra editör alanına erişebilirsin.",
  publisherRoleRequested:
    "Yayınevi rolü talebin alındı. Yönetici onayından sonra yayınevi paneline erişebilirsin.",
  routeStatus: {
    invalidLink: "Doğrulama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.",
    passwordUpdated: "Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.",
    configurationPending: "Kimlik doğrulama servisi için ortam ayarları bekleniyor.",
  },
} as const;
