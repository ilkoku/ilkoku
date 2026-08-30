"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { updateProfileAction } from "../actions";
import { resendVerificationEmailAction } from "../email-verification-actions";
import { initialProfileState } from "../state";

type ProfileFormProps = {
  data: {
    avatarUrl: string;
    bio: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    username: string;
    website: string;
    writingGenres: string[];
  };
};

export function ProfileForm({ data }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialProfileState);
  const [verificationState, verificationAction, verificationPending] = useActionState(
    resendVerificationEmailAction,
    initialProfileState,
  );

  return (
    <>
      {!data.emailVerified && (
        <section className="profile-email-verification" aria-label="E-posta doğrulama durumu">
          <div>
            <strong>E-posta adresiniz henüz doğrulanmadı</strong>
            <p>
              Hesap güvenliği ve önemli bildirimlerin size ulaşması için {data.email} adresini doğrulayın.
            </p>
          </div>
          <form action={verificationAction}>
            <Button loading={verificationPending} type="submit" variant="secondary">
              Doğrulama e-postasını yeniden gönder
            </Button>
          </form>
          {verificationState.message && (
            <p
              className={`profile-status profile-status--${verificationState.status}`}
              role={verificationState.status === "error" ? "alert" : "status"}
            >
              {verificationState.message}
            </p>
          )}
        </section>
      )}

      <form action={formAction} className="profile-form">
        <section className="profile-form__section">
          <div className="profile-section-title">
            <div>
              <span>01</span>
              <div>
                <h3>Temel bilgiler</h3>
                <p>Profilinizde görünen ad ve iletişim bilgileri.</p>
              </div>
            </div>
          </div>

          <div className="profile-form__grid">
            <Field label="Ad" name="firstName" defaultValue={data.firstName} autoComplete="given-name" required />
            <Field label="Soyad" name="lastName" defaultValue={data.lastName} autoComplete="family-name" required />
            <Field
              label="Rumuz"
              name="username"
              defaultValue={data.username}
              placeholder="ornek_yazar"
              message="Profilinizde ve eserlerinizde görünen benzersiz adınız."
              required
            />
            <Field label="E-posta" name="email" control="email" defaultValue={data.email} disabled message="E-posta değişikliği doğrulama gerektirdiği için bu sürümde kapalıdır." />
            <Field label="Profil fotoğrafı bağlantısı" name="avatarUrl" defaultValue={data.avatarUrl} placeholder="https://..." />
            <Field label="Kişisel web sitesi" name="website" defaultValue={data.website} placeholder="https://..." />
          </div>

          <Field
            control="textarea"
            label="Kısa biyografi"
            name="bio"
            defaultValue={data.bio}
            maxLength={600}
            placeholder="Kendinizi ve yazarlık yolculuğunuzu kısaca anlatın."
            message="En fazla 600 karakter."
          />
        </section>

        <section
          className="profile-form__section"
          id="yazdiginiz-turler"
          style={{ scrollMarginTop: "6.25rem" }}
        >
          <div className="profile-section-title profile-section-title--genres">
            <div>
              <span>02</span>
              <div>
                <h3>Yazdığınız türler</h3>
                <p>
                  Bu alan, keşfe açık yayımlanmış eserlerinizde seçtiğiniz türlerden otomatik oluşur.
                </p>
              </div>
            </div>
            <strong>{data.writingGenres.length} tür</strong>
          </div>

          {data.writingGenres.length > 0 ? (
            <div className="genre-selected" aria-label="Eserlerinizden türetilen türler">
              {data.writingGenres.map((genre) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>
          ) : (
            <div className="genre-empty">
              Henüz keşfe açık yayımlanmış bir eseriniz olmadığı için tür listeniz oluşmadı.
            </div>
          )}
        </section>

        {state.message && (
          <p className={`profile-status profile-status--${state.status}`} role="status">
            {state.message}
          </p>
        )}

        <div className="profile-form__actions">
          <Button loading={pending} type="submit">Profili kaydet</Button>
        </div>
      </form>
    </>
  );
}
