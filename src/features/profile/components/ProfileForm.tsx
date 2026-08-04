"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { updateProfileAction } from "../actions";
import { writingGenreGroups } from "../data";
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
  const [query, setQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(data.writingGenres);

  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const visibleGroups = useMemo(
    () =>
      writingGenreGroups
        .map((group) => ({
          ...group,
          options: group.options.filter((genre) =>
            genre.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
          ),
        }))
        .filter((group) => group.options.length > 0),
    [normalizedQuery],
  );

  function toggleGenre(genre: string) {
    setSelectedGenres((current) =>
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre],
    );
  }

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

        <section className="profile-form__section">
          <div className="profile-section-title profile-section-title--genres">
            <div>
              <span>02</span>
              <div>
                <h3>Yazdığınız türler</h3>
                <p>Kategorileri açın veya arama yaparak türlerinizi kolayca seçin.</p>
              </div>
            </div>
            <strong>{selectedGenres.length} tür seçildi</strong>
          </div>

          <div className="genre-picker">
            <label className="genre-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Tür ara"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tür ara: roman, bilim kurgu, şiir..."
                type="search"
                value={query}
              />
            </label>

            {selectedGenres.length > 0 && (
              <div className="genre-selected" aria-label="Seçilen türler">
                {selectedGenres.map((genre) => (
                  <button key={genre} onClick={() => toggleGenre(genre)} type="button">
                    {genre}<span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}

            <div className="genre-groups">
              {visibleGroups.map((group, index) => (
                <details className="genre-group" key={group.id} open={normalizedQuery.length > 0 || index === 0}>
                  <summary>
                    <span>{group.label}</span>
                    <small>{group.options.filter((genre) => selectedGenres.includes(genre)).length}/{group.options.length} seçili</small>
                  </summary>
                  <div className="profile-genres__grid">
                    {group.options.map((genre) => {
                      const checked = selectedGenres.includes(genre);
                      return (
                        <label className="profile-genre" key={genre}>
                          <input
                            checked={checked}
                            name="writingGenres"
                            onChange={() => toggleGenre(genre)}
                            type="checkbox"
                            value={genre}
                          />
                          <span>
                            <i aria-hidden="true">{checked ? "✓" : "+"}</i>
                            {genre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              ))}

              {visibleGroups.length === 0 && (
                <div className="genre-empty">Aramanızla eşleşen bir tür bulunamadı.</div>
              )}
            </div>
          </div>
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
