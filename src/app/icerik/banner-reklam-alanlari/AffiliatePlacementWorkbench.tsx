"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  validateAffiliateCreativeSet,
  type AffiliateBannerCreative,
  type AffiliateTextCreative,
} from "@/lib/affiliate-creative";
import type { AffiliatePlacementSetting } from "@/lib/affiliate-placement";
import styles from "./BannerAdvertisingPage.module.css";

type Props = {
  initialSetting: AffiliatePlacementSetting;
  firstRun: boolean;
};

type PreviewState = {
  desktop: AffiliateBannerCreative;
  mobile: AffiliateBannerCreative;
  text: AffiliateTextCreative;
};

function same(a: AffiliatePlacementSetting, b: AffiliatePlacementSetting) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function errorLabel(field: string | null) {
  if (field === "desktop") return "Masaüstü kodu geçerli bir 728×90 kreatif değil.";
  if (field === "mobile") return "Mobil kodu geçerli bir 300×250 kreatif değil.";
  if (field === "text") return "Metin kreatifi geçerli bir HTTPS affiliate linki değil.";
  return "Affiliate kodlarını kontrol edin.";
}

export function AffiliatePlacementWorkbench({ initialSetting, firstRun }: Props) {
  const [setting, setSetting] = useState(initialSetting);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const dirty = useMemo(() => !same(setting, initialSetting), [setting, initialSetting]);

  function buildPreview() {
    if (!setting.headline.trim()) {
      setPreview(null);
      setPreviewError("Kampanya başlığı boş bırakılamaz.");
      return false;
    }

    const validation = validateAffiliateCreativeSet(setting);
    if (!validation.ok || !validation.desktop || !validation.mobile || !validation.text) {
      setPreview(null);
      setPreviewError(errorLabel(validation.invalidField));
      return false;
    }

    setPreview({
      desktop: validation.desktop,
      mobile: validation.mobile,
      text: validation.text,
    });
    setPreviewError(null);
    return true;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (!editing) {
      event.preventDefault();
      return;
    }
    if (!buildPreview()) event.preventDefault();
  }

  function reset() {
    setSetting(initialSetting);
    setPreview(null);
    setPreviewError(null);
    setEditing(false);
  }

  return (
    <form action="/api/affiliate-placement" method="post" className={styles.workbench} onSubmit={submit}>
      <input type="hidden" name="placement" value="homepage_after_roles" />

      <div className={styles.toolbar}>
        <div>
          <strong>{editing ? "Düzenleme modu açık" : "Canlı kayıt korunuyor"}</strong>
          <small>
            {editing
              ? "Değişiklikler Kaydet düğmesine basılana kadar ana sayfaya uygulanmaz."
              : "Kodları değiştirmek için Düzenle düğmesini kullanın."}
          </small>
        </div>
        <div className={styles.toolbarActions}>
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)}>Düzenle</button>
          ) : (
            <button type="button" onClick={reset}>Vazgeç</button>
          )}
          <button type="button" onClick={buildPreview}>Önizlemeyi Göster</button>
        </div>
      </div>

      <div className={styles.settingsGrid}>
        <section className={styles.settingCard}>
          <div className={styles.settingTop}>
            <div>
              <span className={styles.kicker}>Ana Sayfa</span>
              <h3>Rol Kartları Sonrası</h3>
            </div>
            <span className={styles.badge} data-tone={setting.enabled ? "success" : "warning"}>
              {setting.enabled ? "Aktif" : "Pasif"}
            </span>
          </div>

          <p>Masaüstü, mobil ve metin kreatifi bu tek reklam alanının parçasıdır.</p>

          <div className={styles.options}>
            <label className={styles.option}>
              <input
                type="radio"
                name="enabled"
                value="active"
                checked={setting.enabled}
                disabled={!editing}
                onChange={() => setSetting((current) => ({ ...current, enabled: true }))}
              />
              <span><strong>Aktif</strong><small>Reklam alanı ana sayfada görünür.</small></span>
            </label>
            <label className={styles.option}>
              <input
                type="radio"
                name="enabled"
                value="passive"
                checked={!setting.enabled}
                disabled={!editing}
                onChange={() => setSetting((current) => ({ ...current, enabled: false }))}
              />
              <span><strong>Pasif</strong><small>Reklam alanı masaüstü ve mobilde tamamen gizlenir.</small></span>
            </label>
          </div>
        </section>

        <section className={styles.settingCard}>
          <div className={styles.settingTop}>
            <div>
              <span className={styles.kicker}>Kampanya metni</span>
              <h3>Başlık</h3>
            </div>
            <span className={styles.badge}>{setting.headline.length}/140</span>
          </div>
          <p>Başka bir reklamveren veya kampanya kullanıldığında ana sayfadaki başlığı buradan değiştirin.</p>
          <input
            className={styles.textInput}
            type="text"
            name="headline"
            maxLength={140}
            required
            readOnly={!editing}
            value={setting.headline}
            onChange={(event) => setSetting((current) => ({ ...current, headline: event.target.value }))}
          />
        </section>
      </div>

      <section className={styles.editorSection} aria-labelledby="affiliate-editor-heading">
        <div className={styles.sectionHeader}>
          <div>
            <span>Reklam kodları</span>
            <h2 id="affiliate-editor-heading">Kreatifleri Düzenle / Değiştir</h2>
            <p>Yeni kodu ilgili kutuya yapıştırın. Sistem yalnız HTTPS bağlantı ve görselleri kabul eder; script/iframe/event kodları public sayfaya taşınmaz.</p>
          </div>
        </div>

        <div className={styles.codeGrid}>
          <article className={styles.codeCard}>
            <div className={styles.codeCardHeader}>
              <div><span>Masaüstü</span><strong>728×90 Banner</strong></div>
              <small>728×90</small>
            </div>
            <textarea
              className={styles.codeArea}
              name="desktopCode"
              aria-label="Masaüstü 728×90 affiliate kodu"
              rows={11}
              readOnly={!editing}
              value={setting.desktopCode}
              onChange={(event) => setSetting((current) => ({ ...current, desktopCode: event.target.value }))}
            />
          </article>

          <article className={styles.codeCard}>
            <div className={styles.codeCardHeader}>
              <div><span>Mobil</span><strong>300×250 Banner</strong></div>
              <small>300×250</small>
            </div>
            <textarea
              className={styles.codeArea}
              name="mobileCode"
              aria-label="Mobil 300×250 affiliate kodu"
              rows={11}
              readOnly={!editing}
              value={setting.mobileCode}
              onChange={(event) => setSetting((current) => ({ ...current, mobileCode: event.target.value }))}
            />
          </article>

          <article className={styles.codeCard}>
            <div className={styles.codeCardHeader}>
              <div><span>Metin kreatifi</span><strong>Affiliate link + 1×1 piksel</strong></div>
              <small>Metin</small>
            </div>
            <textarea
              className={styles.codeArea}
              name="textCode"
              aria-label="Metin affiliate kodu ve takip pikseli"
              rows={11}
              readOnly={!editing}
              value={setting.textCode}
              onChange={(event) => setSetting((current) => ({ ...current, textCode: event.target.value }))}
            />
          </article>
        </div>
      </section>

      {previewError ? (
        <div className={styles.previewError} role="alert">
          <strong>Önizleme oluşturulamadı.</strong>
          <span>{previewError}</span>
        </div>
      ) : null}

      {preview ? (
        <section className={styles.previewSection} aria-labelledby="affiliate-preview-heading">
          <div className={styles.sectionHeader}>
            <div>
              <span>Kaydetmeden önce</span>
              <h2 id="affiliate-preview-heading">Önizleme</h2>
              <p>Takip pikseli önizlemede çalıştırılmaz. Banner görselleri yalnız bu önizleme açıldığında yüklenir.</p>
            </div>
          </div>

          <div className={styles.previewGrid}>
            <article className={styles.previewCard}>
              <div className={styles.previewLabel}>Masaüstü önizleme</div>
              <div className={styles.desktopPreview}>
                <div className={styles.previewCopy}>
                  <small>Okurlar için</small>
                  <strong>{setting.headline}</strong>
                  <span>{preview.text.text}</span>
                  <em>İş ortağı bağlantısı</em>
                </div>
                <div className={styles.previewBanner}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.desktop.src} width={728} height={90} alt={preview.desktop.alt} />
                </div>
              </div>
            </article>

            <article className={styles.previewCard}>
              <div className={styles.previewLabel}>Mobil önizleme</div>
              <div className={styles.mobilePreview}>
                <div className={styles.previewCopy}>
                  <small>Okurlar için</small>
                  <strong>{setting.headline}</strong>
                  <span>{preview.text.text}</span>
                  <em>İş ortağı bağlantısı</em>
                </div>
                <div className={styles.previewBanner}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.mobile.src} width={300} height={250} alt={preview.mobile.alt} />
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <div className={styles.saveBar}>
        <div>
          <strong>
            {editing
              ? dirty || firstRun
                ? "Kaydedilmemiş reklam değişiklikleri var"
                : "Düzenleme modu açık · değişiklik yok"
              : "Canlı reklam kaydı korunuyor"}
          </strong>
          <small>Kaydetme sonrası ana sayfa önbelleği temizlenir ve yeni kreatifler canlıya alınır.</small>
        </div>
        <div className={styles.toolbarActions}>
          {editing && dirty ? <button type="button" onClick={() => setSetting(initialSetting)}>Değişiklikleri Geri Al</button> : null}
          <button type="submit" disabled={!editing || (!dirty && !firstRun)}>Kaydet ve Canlıya Uygula</button>
        </div>
      </div>
    </form>
  );
}
