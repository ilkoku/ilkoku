import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { requirePublisherDiscoveryAccess } from "@/features/publisher-discovery/access";
import { PublisherSharedItemsList } from "@/features/publisher-discovery/components/PublisherSharedItemsList";
import { getPublisherSharedItems } from "@/features/publisher-discovery/sharing-repository";
import "@/features/publisher-discovery/publisher-discovery.css";
import "@/features/publisher-discovery/publisher-sharing.css";

export const metadata: Metadata = {
  description:
    "Yayınevi ekibinin sizinle paylaştığı eser ve yazar kayıtlarını görüntüleyin.",
  title: "Benimle Paylaşılanlar | İlkOku",
};

export const dynamic = "force-dynamic";

export default async function PublisherSharedItemsPage() {
  const access = await requirePublisherDiscoveryAccess(
    "/yayinevi/paylasilanlar",
    "view_shared_items",
  );
  const data = await getPublisherSharedItems(access.profile.id);

  if (!data) {
    redirect("/erisim-reddedildi?gerekli=view_shared_items");
  }

  const unreadCount = data.items.filter((item) => !item.readAt).length;
  const canViewPassport = access.permissions.includes(
    "view_authorized_passport",
  );

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Yayınevi ekibinin zorunlu notla size yönlendirdiği public eser ve yazar kayıtlarını tek kutuda inceleyin."
          eyebrow={data.companyName}
          title="Benimle Paylaşılanlar"
        />

        <section className="publisher-discovery-summary">
          <div>
            <span>Toplam paylaşım</span>
            <strong>{data.items.length} kayıt</strong>
          </div>
          <p>
            {data.adminReadOnly
              ? "Admin görünümünde yayınevinin son ekip paylaşımları salt okunur gösterilir."
              : `${unreadCount} okunmamış paylaşımınız bulunuyor.`}
          </p>
        </section>

        {data.items.length ? (
          <PublisherSharedItemsList
            adminReadOnly={data.adminReadOnly}
            canViewPassport={canViewPassport}
            items={data.items}
          />
        ) : (
          <section className="publisher-discovery-empty">
            <h2>Henüz paylaşım bulunmuyor</h2>
            <p>
              Ekip üyeleri bir eser veya yazarı sizinle paylaştığında burada görünecek.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
