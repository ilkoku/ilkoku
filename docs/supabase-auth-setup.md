# Supabase kimlik doğrulama kurulumu

Bu proje anahtarları repoya yazmaz. Supabase projesi oluşturulduktan sonra `.env.example` dosyasını `.env.local` olarak kopyalayın ve gerçek `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değerlerini girin.

## Veritabanı

`supabase/migrations/202607150001_create_profiles.sql` dosyasını Supabase SQL Editor veya Supabase CLI ile uygulayın. Migration, kullanıcıya bağlı profil tablosunu, dört rolü, RLS politikalarını ve yeni kullanıcı profil tetikleyicisini oluşturur.

## Yönlendirmeler

Supabase Authentication URL Configuration bölümünde Site URL değerini uygulama adresine ayarlayın. Yerel geliştirme için `http://localhost:3000/**`, üretim için gerçek alan adının callback yollarını Redirect URLs listesine ekleyin.

## E-posta şablonları

Kayıt doğrulama şablonundaki bağlantıyı şu yapıyla kullanın:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/rol-secimi">E-postamı doğrula</a>
```

Şifre yenileme şablonundaki bağlantı:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/sifre-yenile">Şifremi yenile</a>
```

Canlı testlerde kayıt, doğrulama, giriş, rol seçimi, sayfa yenileme, şifre yenileme ve çıkış sırasını gerçek bir test e-posta adresiyle doğrulayın.
