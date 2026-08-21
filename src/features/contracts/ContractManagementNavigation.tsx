import Link from "next/link";

const groups = [
  {
    label: "MERKEZ",
    items: [
      { href: "/sozlesme", label: "Genel Bakış", note: "Gönderim ve canlı takip" },
      { href: "/sozlesme/taslaklar", label: "Soft Taslaklar", note: "Ürün akışına göre önerilen metinler" },
    ],
  },
  {
    label: "ŞABLONLAR",
    items: [
      { href: "/sozlesme/sablonlar", label: "Şablon Kütüphanesi", note: "Aktif ve pasif tüm metinler" },
      { href: "/sozlesme/sablonlar/yeni", label: "Yeni Şablon", note: "Yeni bir metin oluştur" },
    ],
  },
  {
    label: "DENETİM",
    items: [
      { href: "/harita", label: "Sistem Haritası", note: "Route ve operasyon denetimi" },
      { href: "/sistem-yonetimi", label: "Sistem Yönetimi", note: "Admin kontrol merkezi" },
    ],
  },
] as const;

export function ContractManagementNavigation() {
  return (
    <aside className="contract-management-sidebar" aria-label="Sözleşme yönetimi menüsü">
      <div className="contract-management-sidebar__brand">
        <span>İLKOKU</span>
        <strong>Sözleşme Merkezi</strong>
        <small>Admin çalışma alanı</small>
      </div>

      <nav>
        {groups.map((group) => (
          <section key={group.label}>
            <h2>{group.label}</h2>
            <div>
              {group.items.map((item) => (
                <Link href={item.href} key={item.href}>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="contract-management-sidebar__notice">
        <strong>Soft taslak ilkesi</strong>
        <p>Hukuki inceleme tamamlanmadan taslaklar aktif edilmez ve gönderim şablonu sayılmaz.</p>
      </div>
    </aside>
  );
}
