'use client'

import type { NumberFieldClientProps } from 'payload'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import { useId, useState } from 'react'

import './turkceSayiAlani.css'

import { panelSayisiCoz, panelSayisiYaz } from '@/lib/veri/sayiAlani'

/**
 * Türkçe sayı girdisi — Payload'ın `type: 'number'` alanının yerine geçer.
 *
 * Gerekçenin tamamı `@/lib/veri/sayiAlani` başında. Özet: `<input
 * type="number">` Türkçe yerelde iki yönde birden kırık — noktayı ondalık
 * sayıyor, virgülü hiç kabul etmiyor.
 *
 * ⚠️ METİN YEREL, DEĞER FORMDA. Kullanıcı yazarken metni bu bileşen
 * tutuyor; forma giden şey her zaman çözümlenmiş **sayı**. Metni forma
 * yazmak alanın tipini bozar ve veritabanına dize gönderirdi.
 *
 * ⚠️ DIŞARIDAN GELEN DEĞİŞİKLİK METNİ EZER (`initialValue`). Kancayla
 * hesaplanan alanlar (kira çarpanı gibi) kaydettikten sonra sunucudan yeni
 * değerle dönüyor; metin eski kalsaydı ekran veriyle çelişirdi.
 */
export default function TurkceSayiAlani(props: NumberFieldClientProps) {
  const { field, path: yolProp, readOnly } = props
  const { disabled, path, setValue, showError, value, initialValue } = useField<number | null>({
    potentiallyStalePath: yolProp,
  })

  // ⚠️ Salt okunur alan yine de bu bileşenle çizilebilir (satır düzeni,
  // kanca hesabı). Girdiyi kilitlemezsek kullanıcı yazabilir ve yazdığı
  // kaydedilmez — sessiz veri kaybının başka bir biçimi.
  const kilitli = readOnly === true || disabled === true || field?.admin?.readOnly === true

  const [metin, setMetin] = useState(() => panelSayisiYaz(value))
  const [hata, setHata] = useState<string | null>(null)
  const kimlik = useId()

  /**
   * ⚠️ ÇİZİM SIRASINDA AYARLAMA — `useEffect` DEĞİL.
   *
   * Sunucudan/kancadan gelen değer metni tazelemeli. Bunu bir etkiyle
   * yapmak fazladan bir çizim turu doğurur: kullanıcı bir an eski metni
   * görür. React'in "prop değişince durumu ayarla" kalıbı tek turda
   * biter ve `react-hooks/set-state-in-effect` kuralına takılmaz.
   *
   * Kullanıcının yazdığı ara metin korunur, çünkü bu dal yalnızca
   * `initialValue` gerçekten değişince çalışır.
   */
  const [oncekiIlkDeger, setOncekiIlkDeger] = useState(initialValue)
  if (initialValue !== oncekiIlkDeger) {
    setOncekiIlkDeger(initialValue)
    setMetin(panelSayisiYaz(initialValue))
    setHata(null)
  }

  const yaziliyor = (ham: string) => {
    setMetin(ham)
    const cozum = panelSayisiCoz(ham)
    setHata(cozum.hata)
    setValue(cozum.deger)
  }

  const cozum = panelSayisiCoz(metin)
  const okunan = cozum.hata === null && cozum.deger !== null ? panelSayisiYaz(cozum.deger) : null

  return (
    <div className={`field-type number turkce-sayi ${showError ? 'error' : ''}`}>
      <FieldLabel htmlFor={kimlik} label={field?.label} required={field?.required} />

      <div className="field-type__wrap">
        <FieldError path={path} />

        {/*
          ⚠️ type="text" ZORUNLU, inputMode="decimal" YETMEZ.
          inputMode yalnızca mobil klavyeyi seçer; masaüstünde tarayıcı
          hâlâ type="number" davranışını uygular ve nokta yine ondalık
          sayılır. Kök nedeni kapatan şey type="text".
        */}
        <input
          id={kimlik}
          name={path}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={metin}
          disabled={kilitli}
          readOnly={kilitli}
          onChange={(olay) => yaziliyor(olay.target.value)}
          // Odak çıkınca metin çözümlenmiş hâline döner: "39704" yazan
          // kişi "39.704" görür ve neyin kaydedildiğini bilir.
          onBlur={() => {
            if (cozum.hata === null) setMetin(panelSayisiYaz(cozum.deger))
          }}
          aria-invalid={hata !== null || showError}
          aria-describedby={`${kimlik}-okunan`}
        />

        {/*
          ⚠️ CANLI OKUMA — sessiz hatanın panzehiri. Bindebir kaydedilen
          rakamın tek kusuru ekranda yanlış görünmemesiydi. Burada "39,704"
          ile "39.704" farklı görünür.
        */}
        <p className="turkce-sayi-okunan" id={`${kimlik}-okunan`} aria-live="polite">
          {hata !== null ? (
            <span className="turkce-sayi-hata">{hata}</span>
          ) : okunan !== null ? (
            <>
              Kaydedilecek: <strong>{okunan}</strong>
            </>
          ) : (
            <span className="turkce-sayi-bos">Boş — bilinmiyor olarak kaydedilir.</span>
          )}
        </p>

        <FieldDescription description={field?.admin?.description} path={path} />
      </div>
    </div>
  )
}
