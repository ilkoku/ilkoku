import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import {
  getWriterComments,
} from "@/features/reader/comments";
import { ReaderCommentList } from "@/features/reader/components/ReaderCommentList";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Yorumlarım | İlkOku",
  description:
    "Eserlerinize gelen okur yorumlarını görüntüleyin ve yanıtlayın.",
};

export const dynamic = "force-dynamic";

export default async function WriterCommentsPage() {
  const profile =
    await getCurrentProfile();

  if (!profile) {
    redirect(
      "/giris?sonraki=/yorumlarim",
    );
  }

  if (profile.role !== "writer") {
    redirect(
      "/erisim-reddedildi?kaynak=writer-comments",
    );
  }

  const comments =
    await getWriterComments(
      profile.id,
    );

  return (
    <AppShell profile={profile}>
      <div className={styles.workspace}>
        <EditorPageHeader
          description="Yayımlanmış eserlerinize gelen okur yorumlarını takip edin. Yanıt yetkisi yalnızca eserin yazarına aittir."
          eyebrow="Yazar alanı"
          title="Yorumlarım"
        />

        <section
          aria-label="Yorum özeti"
          className={styles.summary}
        >
          <article
            className={styles.stat}
          >
            <span>
              Toplam okur yorumu
            </span>

            <strong>
              {comments.total.toLocaleString(
                "tr-TR",
              )}
            </strong>
          </article>

          <article
            className={styles.stat}
          >
            <span>
              Yanıt bekleyen
            </span>

            <strong>
              {comments.unanswered.toLocaleString(
                "tr-TR",
              )}
            </strong>
          </article>
        </section>

        <ReaderCommentList
          authorMode
          emptyText="Yayımlanmış eserlerinize henüz okur yorumu gelmedi."
          feed={comments}
          returnPath="/yorumlarim"
        />
      </div>
    </AppShell>
  );
}
