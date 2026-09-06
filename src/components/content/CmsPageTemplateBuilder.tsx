"use client";

import { useMemo, useState } from "react";
import { saveCmsPageAction } from "@/features/cms/page-actions";
import { cmsPageTemplates, getCmsPageTemplate, type CmsPageTemplateKey } from "@/lib/cms-page-templates";

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ç]/g, "c")
    .replace(/[ğ]/g, "g")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ş]/g, "s")
    .replace(/[ü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function CmsPageTemplateBuilder() {
  const [templateKey, setTemplateKey] = useState<CmsPageTemplateKey>(cmsPageTemplates[0].key);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const initialTemplate = useMemo(() => getCmsPageTemplate(templateKey), [templateKey]);
  const [summary, setSummary] = useState(initialTemplate.summary);
  const [body, setBody] = useState(initialTemplate.body);
  const [seoDescription, setSeoDescription] = useState(initialTemplate.seoDescription);

  function chooseTemplate(nextKey: CmsPageTemplateKey) {
    const template = getCmsPageTemplate(nextKey);
    setTemplateKey(nextKey);
    setSummary(template.summary);
    setBody(template.body);
    setSeoDescription(template.seoDescription);
  }

  function changeTitle(nextTitle: string) {
    setTitle(nextTitle);
    if (!slugTouched) setSlug(slugify(nextTitle));
  }

  return (
    <form action={saveCmsPageAction} className="content-form">
      <input type="hidden" name="mode" value="draft" />

      <div className="cms-editor-section-label">
        <span>1 · Şablon seç</span>
        <small>Geometri ve marka kimliği sistemde kalır; içerik iskeletini seçersiniz.</small>
      </div>

      <div className="content-metric-grid">
        {cmsPageTemplates.map((template) => {
          const selected = template.key === templateKey;
          return (
            <label
              className="content-metric-card"
              key={template.key}
              style={{ cursor: "pointer", outline: selected ? "2px solid #6847e8" : undefined }}
            >
              <input
                checked={selected}
                name="pageTemplate"
                onChange={() => chooseTemplate(template.key)}
                style={{ width: "auto", marginBottom: ".7rem" }}
                type="radio"
                value={template.key}
              />
              <strong>{template.label}</strong>
              <p style={{ margin: ".5rem 0" }}>{template.description}</p>
              <small>{template.bestFor}</small>
            </label>
          );
        })}
      </div>

      <div className="cms-editor-section-label" style={{ marginTop: "1.4rem" }}>
        <span>2 · Sayfayı adlandır</span>
        <small>URL ilk kayıttan sonra mevcut CMS kuralı gereği sabitlenir.</small>
      </div>

      <label>
        <span>Başlık</span>
        <input
          maxLength={220}
          name="title"
          onChange={(event) => changeTitle(event.target.value)}
          placeholder="Örn. İlkOku'da Yayın Süreci"
          required
          value={title}
        />
      </label>
      <label>
        <span>URL kısa adı</span>
        <input
          maxLength={120}
          name="slug"
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugify(event.target.value));
          }}
          placeholder="ilkoku-yayin-sureci"
          required
          value={slug}
        />
      </label>
      <p className="content-form-help">Yalnız a-z, 0-9 ve tire kullanılır. Yönetim ve kodla sahip olunan public rotalar mevcut sunucu kontrolüyle yine rezerve edilir.</p>

      <div className="cms-editor-section-label">
        <span>3 · Şablon içeriğini düzenle</span>
        <small>Bu alanlar taslak oluşturulmadan önce değiştirilebilir; sonrasında normal Sayfa Editörü açılır.</small>
      </div>
      <label>
        <span>Kısa özet</span>
        <textarea maxLength={500} name="summary" onChange={(event) => setSummary(event.target.value)} rows={4} value={summary} />
      </label>
      <label>
        <span>Sayfa metni</span>
        <textarea name="body" onChange={(event) => setBody(event.target.value)} required rows={22} value={body} />
      </label>
      <p className="content-form-help">## ara başlık, ### alt başlık, madde listesi, numaralı liste ve tablo yapısı ortak İlkOku public sayfa renderer'ı tarafından desteklenir.</p>

      <div className="cms-editor-section-label">
        <span>4 · Arama görünümü</span>
        <small>Taslak oluşturduktan sonra SEO Merkezi ve yayın kalite kapısı aynı şekilde çalışmaya devam eder.</small>
      </div>
      <label>
        <span>SEO başlığı</span>
        <input maxLength={220} name="seoTitle" placeholder="İsterseniz boş bırakın; sayfa başlığı fallback olur." />
      </label>
      <label>
        <span>SEO açıklaması</span>
        <textarea maxLength={500} name="seoDescription" onChange={(event) => setSeoDescription(event.target.value)} rows={3} value={seoDescription} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
        <input name="noIndex" style={{ width: "auto" }} type="checkbox" />
        <span>Arama motorlarında gösterme (noindex)</span>
      </label>

      <div className="content-panel cms-editor-notice is-info" style={{ marginTop: "1rem" }}>
        <strong>Şablon yalnız taslak oluşturur.</strong>
        <p>Bu ekranda doğrudan yayın butonu yoktur. Oluşturduğunuz kayıt normal Sayfa Editörü'ne gider; önizleme, kalite kontrolü ve yayın yetkisi mevcut güvenli akıştan devam eder.</p>
      </div>

      <div className="cms-editor-savebar">
        <a href="/icerik/sayfalar">← Sayfa listesi</a>
        <div className="cms-editor-savebar__actions">
          <button type="submit">Şablondan taslak oluştur</button>
        </div>
      </div>
    </form>
  );
}
