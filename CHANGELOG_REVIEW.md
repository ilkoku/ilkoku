# İlkOku — Değişiklik Özeti

## 27 Temmuz 2026

### Eklendi

- `src/app/editor/yazarlar/page.tsx`
  - Editör için yazar keşif ekranı.
  - Güvenli yazar sorgusu.
  - Yazar/eser arama.
  - Tür ve şehir filtreleri.
  - Sayfalama.
  - Yayımlanmış eser kartları.

### Değiştirildi

- `src/content/navigation.ts`
  - `Yazar Keşfet` aktif route'a bağlandı.

- `src/features/editor-workspace/editor-workspace.css`
  - Yazar keşif ekranı stilleri eklendi.

- `src/app/editor/kesfet/page.tsx`
  - İkinci editör durum filtreleri eklendi.

- `src/features/editor-workspace/components/EditorWorkCard.tsx`
  - Yeni inceleme durum etiketleri eklendi.
  - İkinci editör aşamasındaki eserlerin yeniden sahiplenilmesi engellendi.

- `src/features/editor-workspace/components/EditorWorksTable.tsx`
  - İkinci editör durumları doğru etiketlendi.
  - İkinci editör aşamasındaki eserler kilitli gösterildi.

- `src/features/editor-workspace/components/EditorReviewBadge.tsx`
  - İkinci editör bekleme ve inceleme rozetleri eklendi.

### Dokunulmadı

- Canlı veritabanı.
- Hostinger.
- GitHub.
- `.env` dosyaları.

## 2026-07-27 — Editör inceleme listeleri ayrıştırıldı

- `/editor/incelemeler` yalnızca devam eden incelemeleri gösterir.
- `/editor/incelemeler?durum=tamamlanan` yalnızca tamamlanan incelemeleri gösterir.
- İki görünüm için ayrı başlık, açıklama, boş durum, kart bilgisi ve işlem metni eklendi.
- Tamamlanan incelemeler için `/editor/incelemeler/[workId]` rapor detay sayfası eklendi.
- Aktif inceleme durumlarına ikinci editör bekleme ve inceleme durumları dahil edildi.
- Değişen TypeScript/TSX dosyaları sözdizimi kontrolünden geçti.
- Tam çalışma doğrulaması kullanıcının local ortamında yapılacaktır; ilerleme yüzdesi artırılmadı.
