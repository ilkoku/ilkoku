import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { getCommonEditorDiscovery } from "@/features/editor-workspace/common-discovery-query";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorksTable } from "@/features/editor-workspace/components/EditorWorksTable";
import {
  isPublicStoredWorkContentRating,
  publicStoredWorkContentRatings,
  workContentRatingDetails,
} from "@/lib/work-content-classification";

export const metadata: Metadata = {
  title: "Editör Keşfet | İlkOku",
  description: "İlkOku ortak havuzundaki yayımlanmış eserleri keşfedin.",
};

export const dynamic = "force-dynamic";

export default async function EditorDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{
    dil?: string;
    durum?: string;
    hitap?: string;
    kelime?: string;
    tur?: string;
  }>;
}) {
  const profile = await requireEditorProfile("/editor/kesfet");
  const parameters = await searchParams;
  const contentRating = isPublicStoredWorkContentRating(parameters.hitap)
    ? parameters.hitap
    : undefined;
  const works = await getCommonEditorDiscovery(profile.id, {
    contentRating,
    genre: parameters.tur,
    language: parameters.dil,
    reviewStatus: parameters.durum,
    wordCount: parameters.kelime,
  });

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Okuyucu ve yayınevleriyle aynı ortak Keşfet havuzundaki yayımlanmış eserleri inceleyin."
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
            <span>Hitap yaşı</span>
            <select defaultValue={contentRating ?? ""} name="hitap">
              <option value="">Tümü</option>
              {publicStoredWorkContentRatings.map((rating) => (
                <option key={rating} value={rating}>
                  {workContentRatingDetails[rating].label}
                </option>
              ))}
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
              <option value="in_progress">İlk editörde</option>
              <option value="awaiting_second_editor">İkinci editör bekliyor</option>
              <option value="second_in_progress">İkinci editörde</option>
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
          <EditorWorksTable
            currentEditorId={profile.id}
            works={works}
          />
        )}
      </div>
    </AppShell>
  );
}
