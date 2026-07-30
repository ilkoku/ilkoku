import { Field } from "@/components/ui/Field";
import {
  publicationCategoryOptions,
  publisherCompanyTypes,
  type PublisherApplicationDefaults,
} from "../schema";
import "../publisher-application.css";

export function PublisherApplicationFields({
  defaults = {},
}: {
  defaults?: Partial<PublisherApplicationDefaults>;
}) {
  const selectedCategories = new Set(defaults.publicationCategories ?? []);
  const documentUrls = (defaults.verificationDocumentUrls ?? []).join("\n");

  return (
    <fieldset className="publisher-application-fields">
      <legend>Kurumsal yayınevi başvurusu</legend>
      <p className="publisher-application-fields__intro">
        Yayınevi rolü, kurumsal bilgiler yönetici tarafından doğrulandıktan
        sonra etkinleşir. Rumuzunuz yayınevi adı olarak kullanılmaz.
      </p>

      <section>
        <header>
          <span>01</span>
          <div>
            <h3>Yetkili kişi</h3>
            <p>Başvuru ve doğrulama sürecinde iletişime geçilecek kişi.</p>
          </div>
        </header>
        <div className="publisher-application-fields__grid">
          <Field
            autoComplete="given-name"
            defaultValue={defaults.authorizedPersonFirstName}
            label="Yetkili kişi adı"
            maxLength={100}
            name="authorizedPersonFirstName"
            required
          />
          <Field
            autoComplete="family-name"
            defaultValue={defaults.authorizedPersonLastName}
            label="Yetkili kişi soyadı"
            maxLength={100}
            name="authorizedPersonLastName"
            required
          />
          <Field
            defaultValue={defaults.authorizedPersonTitle}
            label="Görevi / unvanı"
            maxLength={160}
            name="authorizedPersonTitle"
            required
          />
          <Field
            autoComplete="tel"
            control="tel"
            defaultValue={defaults.authorizedPersonPhone}
            label="Yetkili kişi telefonu"
            maxLength={24}
            name="authorizedPersonPhone"
            placeholder="+90 5xx xxx xx xx"
            required
          />
          <Field
            autoComplete="email"
            control="email"
            defaultValue={defaults.authorizedPersonEmail}
            label="Yetkili kişi e-postası"
            maxLength={320}
            name="authorizedPersonEmail"
            required
          />
        </div>
      </section>

      <section>
        <header>
          <span>02</span>
          <div>
            <h3>Kurum bilgileri</h3>
            <p>Yayınevinin resmî ve operasyonel bilgileri.</p>
          </div>
        </header>
        <div className="publisher-application-fields__grid">
          <Field
            defaultValue={defaults.publisherName}
            label="Yayınevi adı"
            maxLength={220}
            name="publisherName"
            required
          />
          <Field
            defaultValue={defaults.legalCompanyName}
            label="Resmî şirket / ticaret unvanı"
            maxLength={240}
            name="legalCompanyName"
            required
          />
          <Field
            control="select"
            defaultValue={defaults.companyType ?? ""}
            label="Şirket türü"
            name="companyType"
            required
          >
            <option disabled value="">Seçin</option>
            {publisherCompanyTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Field>
          <Field
            control="number"
            defaultValue={defaults.establishmentYear}
            label="Kuruluş yılı"
            max={new Date().getFullYear()}
            min={1450}
            name="establishmentYear"
            required
          />
          <Field
            defaultValue={defaults.taxOffice}
            label="Vergi dairesi"
            maxLength={160}
            name="taxOffice"
            required
          />
          <Field
            defaultValue={defaults.taxNumber}
            inputMode="numeric"
            label="Vergi numarası"
            maxLength={11}
            minLength={10}
            name="taxNumber"
            required
          />
          <Field
            defaultValue={defaults.mersisOrRegistryNumber}
            label="MERSİS / ticaret sicil numarası"
            maxLength={64}
            name="mersisOrRegistryNumber"
            required
          />
          <Field
            autoComplete="organization"
            control="email"
            defaultValue={defaults.corporateEmail}
            label="Kurumsal e-posta"
            maxLength={320}
            name="corporateEmail"
            required
          />
          <Field
            autoComplete="tel"
            control="tel"
            defaultValue={defaults.corporatePhone}
            label="Kurumsal telefon"
            maxLength={24}
            name="corporatePhone"
            placeholder="+90 212 xxx xx xx"
            required
          />
          <Field
            control="url"
            defaultValue={defaults.websiteUrl}
            label="Web sitesi"
            maxLength={500}
            name="websiteUrl"
            placeholder="https://"
          />
          <Field
            control="url"
            defaultValue={defaults.logoUrl}
            label="Logo bağlantısı"
            maxLength={500}
            name="logoUrl"
            placeholder="https://"
          />
        </div>
        <Field
          control="textarea"
          defaultValue={defaults.description}
          label="Yayınevi tanıtım yazısı"
          maxLength={5000}
          minLength={20}
          name="description"
          required
          rows={6}
        />
      </section>

      <section>
        <header>
          <span>03</span>
          <div>
            <h3>Adres ve faaliyet alanı</h3>
            <p>Kurumsal adres, yayın kategorileri ve başvuru tercihi.</p>
          </div>
        </header>
        <div className="publisher-application-fields__grid">
          <Field
            autoComplete="address-level1"
            defaultValue={defaults.city}
            label="İl"
            maxLength={120}
            name="city"
            required
          />
          <Field
            autoComplete="address-level2"
            defaultValue={defaults.district}
            label="İlçe"
            maxLength={120}
            name="district"
            required
          />
        </div>
        <Field
          autoComplete="street-address"
          control="textarea"
          defaultValue={defaults.address}
          label="Açık adres"
          maxLength={1000}
          minLength={10}
          name="address"
          required
          rows={4}
        />

        <fieldset className="publisher-category-picker">
          <legend>Yayın türleri / kategorileri</legend>
          <div>
            {publicationCategoryOptions.map((category) => (
              <label key={category}>
                <input
                  defaultChecked={selectedCategories.has(category)}
                  name="publicationCategories"
                  type="checkbox"
                  value={category}
                />
                <span>{category}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="publisher-application-toggle">
          <input
            defaultChecked={defaults.acceptsSubmissions ?? true}
            name="acceptsSubmissions"
            type="checkbox"
            value="accepted"
          />
          <span>Eser başvurusu kabul ediyoruz.</span>
        </label>
      </section>

      <section>
        <header>
          <span>04</span>
          <div>
            <h3>Kurumsal doğrulama</h3>
            <p>
              Test aşamasında kurumsal doğrulama belgeleri isteğe bağlıdır.
              Belge yükleme sistemi sonraki aşamada eklenecektir.
            </p>
          </div>
        </header>
        <Field
          control="textarea"
          defaultValue={documentUrls}
          label="Doğrulama belgesi bağlantıları — İsteğe bağlı"
          message="Test aşamasında boş bırakabilirsiniz. Bağlantı ekleyecekseniz her satıra bir tane yazın."
          name="verificationDocumentUrls"
          placeholder={"https://…/vergi-levhasi.pdf\nhttps://…/ticaret-sicil.pdf"}
          rows={5}
        />
      </section>
    </fieldset>
  );
}
