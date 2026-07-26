import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorkCard } from "@/features/editor-workspace/components/EditorWorkCard";
import { getEditorDiscovery } from "@/features/editor-workspace/queries";

export const metadata: Metadata = {
  title: "Editör Keşfet | İlkOku",
  description: "Tamamlanmış ve yayımlanmış eserleri keşfedin.",
};

export const dynamic = "force-dynamic";

export default async function EditorDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{
    dil?: string;
    durum?: string;
    kelime?: string;
    tur?: string;
  }>;
}) {
  const profile = await requireEditorProfile("/editor/kesfet");
  const parameters = await searchParams;
  const works = await getEditorDiscovery(profile.id, {
    genre: parameters.tur,
    language: parameters.dil,
    reviewStatus: parameters.durum,
    wordCount: parameters.kelime,
  });

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Tamamlanmış ve yayımlanmış eserleri okur deneyiminin içinde keşfedin."
          title="Keşfet"
        />

        <form className="editor-filters">
          <label>
            <span>Tür</span>
            <input defaultValue={parameters.tur} name="tur" placeholder="Örn. Roman" />
          </label>
          <label>
            <span>Dil</span>
            <select defaultValue={parameters.dil ?? ""} name="dil">
              <option value="">Tümü</option>
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
            </select>
          </label>
          <label>
            <span>Kelime sayısı</span>
            <select defaultValue={parameters.kelime ?? ""} name="kelime">
              <option value="">Tümü</option>
              <option value="short">30.000 altı</option>
              <option value="medium">30.000 – 80.000</option>
              <option value="long">80.000 üzeri</option>
            </select>
          </label>
          <label>
            <span>Editör incelemesi</span>
            <select defaultValue={parameters.durum ?? ""} name="durum">
              <option value="">Tümü</option>
              <option value="not_requested">Henüz incelenmedi</option>
              <option value="requested">Yazar görüşe açık</option>
              <option value="in_progress">İncelemede</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </label>
          <button className="button button--primary" type="submit">
            Filtrele
          </button>
        </form>

        {works.length === 0 ? (
          <div className="editor-empty">
            <h2>Eşleşen eser bulunamadı</h2>
            <p>Filtreleri değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <div className="editor-work-grid">
            {works.map((work) => (
              <EditorWorkCard key={work.id} work={work} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
