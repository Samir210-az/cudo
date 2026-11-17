import { Modal } from './ui';

const WARNING =
  'Yarış gedərkən admin paneldə "Turnir idarəetməsi" səhifəsi (Yarışlar → yarışı açın → Turnir idarəetməsi, "5. Görüşlər" bölməsi) açıq qalmalıdır. Məşqçilərin gördüyü cədvəlin avtomatik yenilənməsi məhz bu səhifədən gedir. Telefon söndükdə və ya səhifə bağlandıqda yenilənmə dayanır. Yarış günü həmin səhifəni ayrıca bir noutbukda və ya sabit telefonda açıq saxlayın.';

const SECTIONS = [
  {
    title: 'Ümumi görünüş',
    intro:
      'Turnir idarəetməsində altı addım var: qeydiyyat, çəkiliş, kateqoriyalar, püşkatma, görüşlər, nəticələr. Yarışdan əvvəl ayarlar bir dəfə qurulur. Hər addım ayrıca bölmədir.',
    steps: [
      'Yarışlar bölməsində "Yeni yarış" düyməsini basın, adı, tarixi və yeri yazın.',
      'Yarışı açıb "Turnir idarəetməsi" düyməsini basın.',
      'Əvvəlcə "Ayarlar" bölməsini düzəldin, sonra addımlarla irəliləyin.',
    ],
  },
  {
    title: 'Ayarlar (yarışdan əvvəl)',
    intro: 'Ayarlar düzgün qurulmasa kateqoriyalar yanlış çıxar. Ona görə bunu qeydiyyatdan əvvəl bitirin.',
    steps: [
      'Yaş qrupları: hər qrupun kodu və doğum ili aralığı. İdmançı yaş qrupuna doğum ilinə görə düşür.',
      'Çəki kateqoriyaları: hər yaş qrupu üçün oğlan və qız sıraları ayrıca yazılır. Qızlar üçün ayrıca cədvəl yazılmayıbsa, oğlanların çəkiləri götürülür.',
      'Tatami sayı: yarış neçə tatamidə keçiriləcəksə o qədər yazın.',
      'Başlama saatı: birinci görüşün vaxtı.',
      'Bir görüşün müddəti: aralar daxil orta müddət. Cədvəldəki saatlar bu rəqəmə görə hesablanır, ona görə real tempi düşünüb yazın.',
      'Bürünc medal qaydası: üç seçim var. "Təsəlliverici görüşlər" finalçıya uduzanlara bürünc üçün ikinci şans verir, yerlər 3, 3, 5, 5, 7, 7 olur. "İki bürünc" yarımfinalda uduzan iki nəfəri birbaşa bürünc sayır. "Bir bürünc" yarımfinal uduzanları arasında ayrıca görüş keçirir. Dəyişiklik yalnız yeni püşkatmalara aid olur.',
    ],
    note: 'Yarışın qaydası hansıdırsa, ona uyğun seçin. Əmin deyilsinizsə, əvvəlcədən hakim heyəti ilə razılaşdırın.',
  },
  {
    title: '1. Qeydiyyat',
    intro: 'Ən rahat yol məşqçi linkidir. Məşqçi uşaqlarını özü yazır, siz yalnız yoxlayırsınız.',
    steps: [
      '"1. Qeydiyyat" bölməsində "Filial linkləri" düyməsini basın.',
      'Filialın və ya klubun adını yazıb "Link yarat" düyməsini basın. Adı hər dəfə eyni cür yazın, məsələn "Xəzər" ilə "Xezer" iki ayrı klub sayılır.',
      '"Linki kopyala" ilə linki götürüb məşqçiyə göndərin (WhatsApp kifayətdir).',
      'Məşqçi linki açır, hər idmançı üçün soyad, ad, ata adı, doğum tarixi, cins və təxmini çəki yazır.',
      'Yazılanlar sizin qeydiyyat siyahınıza özü düşür. Düşmürsə "Filial linkləri" pəncərəsində "İndi yenilə" düyməsini basın.',
      'Qeydiyyat vaxtı bitdikdə həmin pəncərədə linkin yanındakı "Bağla" düyməsini basın. Sonradan lazım olsa "Aç" ilə geri qaytarırsınız.',
    ],
    note: 'Məşqçinin yazdığı çəki siyahıda "elan 38 kq" kimi görünür. Bu təxmini rəqəmdir, yarış günü çəkiliş real çəki yazılır və elan olunan çəki ayrıca saxlanılır.',
    more: [
      'Özünüz əlavə etmək üçün: "İdmançı əlavə et" ilə bir nəfəri formla yazırsınız.',
      '"Siyahı ilə əlavə et": çox nəfəri bir cədvəl kimi birdən yazırsınız.',
      '"Klubun öz uşaqlarından": klub uşaqları siyahısından seçirsiniz, ad və doğum tarixi özü gəlir.',
    ],
    sub: [
      {
        title: 'Əsas və TƏZƏ qrup',
        text: 'Hər idmançının kartında "Qrup" sahəsi var. TƏZƏ qrupa yazılanlar Əsas qrupla bir kateqoriyaya düşmür, ayrıca kateqoriya yaranır. Kimi hansı qrupa yazacağınıza yarış başlamazdan əvvəl siz qərar verin.',
      },
      {
        title: 'Siyahının yoxlanması və çatışmayan məlumat',
        text: 'Siyahı düzgün olmasa sonrakı bütün addımlar yanlış gedir, ona görə bir dəfə diqqətlə baxın. Eyni uşağın iki dəfə yazılıb-yazılmadığına baxın, artıq sətri silin. Klub adlarının yazılışını yoxlayın, çünki klub adı hərfləri fərqlənsə, sistem onları ayrı klub sayır və klub üzrə medal cədvəli də bölünür. Siyahının üstündə "Çatışan məlumat" düyməsi çıxarsa, demək bəzi idmançılarda doğum tarixi, cins və ya çəki yoxdur. Onu basdığınızda həmin idmançılar siyahı ilə göstərilir, orada tamamlayabilərsiniz.',
      },
    ],
  },
  {
    title: '2. Çəkiliş',
    intro: 'Çəkiliş yarış günü keçirilir. Burada kateqoriya real çəkiyə görə müəyyən olunur.',
    steps: [
      '"2. Çəkiliş" bölməsini açın. Çəkilməyənlər Gözləyən siyahısında olur.',
      'Hər idmançının sətrində məşqçinin yazdığı çəki görünür və yanında "Faktiki" xanası var. Məşqçinin yazdığı rəqəm xanaya hazır gəlir.',
      'İdmançı tərəziyə çıxsın, tərəzinin göstərdiyi real çəkini xanaya yazın (əgər fərqlənirsə dəyişin) və "Təsdiq" düyməsini basın (artıq çəkilmiş idmançıda bu düymə "Yenilə" adlanır). İdmançı "Çəkilən" siyahısına keçir.',
      'Real çəki kateqoriyadan kənara çıxarsa, sətrin altında "yeni kateqoriya" yazılır. Yazılan çəkiyə görə idmançı yeni kateqoriyaya düşür.',
      'Çəkisi kateqoriyaya uyğun gəlməyən və ya tərəzidə çəkilməyən idmançı üçün "Kənar" düyməsini basın. Sonradan qayıdarsa, "Geri qaytar" düyməsi onu siyahıya qaytarır.',
    ],
    note: 'Qeydiyyat siyahısında "çəkilib 38,4 kq (elan 38 kq)" kimi görünür. Hər iki rəqəm saxlanılır, protokolda real çəki istifadə olunur.',
  },
  {
    title: '3. Kateqoriyalar və 4. Püşkatma',
    intro: 'Kateqoriyaları sistem özü qurur, siz yalnız yoxlayırsınız. Püşkatma isə düymə ilə edilir.',
    steps: [
      '"3. Kateqoriyalar" bölməsini açın. Hər kateqoriya yaş qrupu, cins və çəki sinfi ilə yazılır, içindəki idmançılar siyahı şəklində görünür.',
      'Bir nəfərlik və ya çox kiçik kateqoriyalara diqqət edin, onlarda real görüş olmur.',
      '"4. Püşkatma" bölməsini açın. Yarış günü yalnız çəkilmiş idmançılar püşkatmaya düşsün.',
      '"Hamısını püşkat" düyməsini basın. Mötərizədəki rəqəm püşkat gözləyən kateqoriyaların sayıdır.',
      'Tatami sayı birdən çoxdursa, "Tatamilərə böl" düyməsi kateqoriyaları tatamilər arasında bərabərləşdirir. İstəsəniz hər kateqoriya üçün tatamini ayrıca seçə bilərsiniz.',
      'Hər kateqoriyanın tablosunu açıb baxa bilərsiniz.',
      'Səhv olduqda və hələ nəticə yazılmayıbsa, kateqoriyanın altındakı "Yenidən püşkat" düyməsi ilə təkrar püşkatmaq olar.',
    ],
    sub: [
      {
        title: 'Püşkatmadan sonra: PDF-lər və məşqçilər',
        text: '"Tablo PDF" tabloları çap etmək üçündür, hər kateqoriya ayrı səhifədədir. "Məşqçilər üçün PDF" klub üzrə bölünür: hər idmançının görüş nömrəsi, tatamisi, təxmini saatı və rəqibi yazılır. Hər məşqçiyə yalnız öz klubunun səhifəsini verin. Sonrakı mərhələlərin rəqibi hələ bilinmir, birinci tur bitəndən sonra PDF-i yenidən çıxara bilərsiniz.',
      },
      {
        title: 'Məşqçi linki ilə cədvəl',
        text: '"Filial linkləri" pəncərəsində "Cədvəli dərc et" düyməsini bir dəfə basın. Düymə bütün açıq linklərə birdən göndərir, filial seçmək lazım deyil. Hər məşqçi yalnız öz idmançılarını görür. Bundan sonra yenilənmə avtomatikdir, amma turnir səhifəsi açıq olmalıdır.',
      },
    ],
  },
  {
    title: '5. Görüşlərin keçirilməsi',
    warn: true,
    intro: 'Hər görüş bitdikdən sonra nəticəni telefonda yazırsınız. Qalib növbəti mərhələyə özü keçir.',
    steps: [
      '"5. Görüşlər" bölməsini açın. Yuxarıda başlama saatı və hər tataminin təxmini bitmə vaxtı yazılır. Tatami birdən çoxdursa, siyahıdan seçib yalnız bir tataminin görüşlərini görə bilərsiniz.',
      '"Növbədəki", "Bitən" və "Hamısı" bölmələri görüşləri ayırır. Yarış zamanı əsasən Növbədəki sizə lazımdır.',
      'Hər görüş kartında kateqoriya, rəqiblər (ağ və mavi) və nəticə üçün düymələr var.',
    ],
    sub: [
      {
        title: 'Nəticəni yazmağın iki yolu',
        text: 'Birinci yol, qalibi birbaşa seçmək. Qalib idmançının düyməsini basın, "Qalibiyyət növü" siyahısından seçin (İppon, Vaza-ari, Yuko, Qərar, Hansoku-make, Çəkilmə və s.). Hakim heyəti yalnız qalibi elan edirsə, bu yol kifayətdir.',
      },
      {
        title: 'Bal yazmaq',
        text: 'İkinci yol, bal yazmaq. Hər idmançı üçün dörd sayğac var: İppon, Vaza-ari, Yuko, Şido. + və − düymələri ilə sayı dəyişirsiniz. Sistem bundan sonra bunları özü hesablayır: iki vaza-ari İppon sayılır və qalib avtomatik təyin olunur. Üç şido Hansoku-make sayılır, rəqib qalib olur. Bir vaza-ari və ya yuko üstünlüyü varsa, qalib avtomatik yazılmır. "Bal əsasında qalibi təyin et" düyməsini siz basırsınız, çünki görüş bitib-bitmədiyini siz bilirsiniz. Ballar bərabərdirsə sistem xəbərdarlıq edir, qalibi yuxarıdakı düymələrlə seçin.',
      },
      {
        title: 'Tabloda hesab necə yazılır',
        text: 'Tabloda hesab üç rəqəmlidir: ardıcıl İppon, Vaza-ari, Yuko. Məsələn 012 o deməkdir ki, 0 ippon, 1 vaza-ari, 2 yuko. Sarı zolaq şido deməkdir. Qalib qaydaları beynəlxalq cüdo qaydalarına yaxındır. Siz fərqli qayda tətbiq edirsinizsə, qalibi düymə ilə seçin.',
      },
      {
        title: 'Nəticə yazdan sonra',
        text: 'Qalib növbəti mərhələdə öz yerini alır. Rəqibi bilinməyən yerlərdə "rəqib hələ bəlli deyil" yazılır. Finala çıxanlara uduzanlar təsəlliverici görüşlərə, bürünc görüşlərinə düşür. Bunlar tabloda özü yaranır. Dərc edilmiş cədvəl bir neçə saniyəyə yenilənir (turnir səhifəsi açıq qalmalıdır), məşqçi səhifəsi isə hər 45 saniyədə bir yoxlayır.',
      },
      {
        title: 'Səhv yazanda',
        text: 'Görüşün kartında "Nəticəni sil" düyməsi var. Səhv düzəldib yenidən yazın. Qalib artıq növbəti mərhələdə oynayıbsa və orada nəticə yazılıbsa, əvvəl həmin növbəti nəticəni silin. Sistem sıranı pozmamaq üçün bunu tələb edir.',
      },
    ],
  },
  {
    title: '6. Nəticələr, medallar və protokol',
    intro: 'Bütün görüşlər bitdikdən sonra yerlər, klub medalları və rəsmi protokol bir yerdə hazır olur.',
    steps: [
      '"6. Nəticələr" bölməsini açın. Hər kateqoriyanın yerləri (1, 2, 3 və s.) ayrı göstərilir.',
      '"Klub üzrə medallar" cədvəli hər klubun qızıl, gümüş və bürünc sayını yazır.',
      '"Protokol PDF" düyməsi rəsmi protokolu çıxarır. Onu çap edib hakim heyətinin imzasına verin.',
      'Dairəvi sistemdə xallar bərabər qalsa, yerləri əl ilə təyin etmək tələb oluna bilər. Sistem bu halda sizdən seçim istəyir.',
    ],
    note: 'Medal alan idmançının adının yanında qızıl, gümüş və ya bürünc dairə görünür: qeydiyyat siyahısında, yarış səhifəsindəki "Turnirdə yazılanlar" siyahısında və klubun uşaqlar siyahısında. Uşaqlar siyahısında medal yarışdan sonra 30 gün qalır.',
  },
  {
    title: 'Səhv olanda nə etməli',
    table: [
      ['Məşqçi çəkini səhv yazıb', 'Çəkilişdə real çəkini yazın. Elan olunan çəki ayrıca qalır, sistem real çəkiyə görə kateqoriya seçir.'],
      ['İdmançı səhv kateqoriyaya düşüb', 'Doğum tarixini, cinsini və çəkini yoxlayın, səhv varsa düzəldin. Püşkatma olubsa kateqoriyanı yenidən püşkatın.'],
      ['Püşkatmadan sonra yeni idmançı gəlib', 'Əvvəlki tablo özü dəyişmir. Nəticə yazılmayıbsa kateqoriyanı yenidən püşkatın. Nəticə yazılıbsa əvvəl həmin kateqoriyanın nəticələrini silməlisiniz.'],
      ['Yanlış qalib seçilib', 'Görüş kartında "Nəticəni sil" düyməsini basın, düzgün nəticəni yazın. Qalib artıq növbəti görüşdə oynayıbsa, əvvəl o görüşün nəticəsini silin.'],
      ['Məşqçi cədvəli görmür', '"Filial linkləri" pəncərəsində "Cədvəli dərc et" düyməsini basın. Linkin "Açıqdır" yazıldığını və turnir səhifəsinin açıq olduğunu yoxlayın.'],
    ],
  },
  {
    title: 'Yarışdan sonra',
    steps: [
      'Məşqçi linklərini "Bağla" ilə bağlayın.',
      'Protokol PDF-ini və tablo PDF-ini saxlayın.',
      'Medallar yarış səhifəsində və uşaqlar siyahısında 30 gün görünəcək.',
    ],
  },
];

function Section({ s, open }) {
  return (
    <details className="guide-sec" open={open}>
      <summary>{s.title}</summary>
      <div className="guide-body">
        {s.intro && <p>{s.intro}</p>}
        {s.steps && (
          <ol>
            {s.steps.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        )}
        {s.more && (
          <>
            <p className="guide-h">Başqa yollar</p>
            <ul>{s.more.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </>
        )}
        {s.sub && s.sub.map((x) => (
          <div key={x.title}>
            <p className="guide-h">{x.title}</p>
            <p>{x.text}</p>
          </div>
        ))}
        {s.table && (
          <div className="guide-table">
            {s.table.map(([a, b]) => (
              <div key={a} className="guide-row">
                <strong>{a}</strong>
                <span>{b}</span>
              </div>
            ))}
          </div>
        )}
        {s.warn && <p className="guide-warn"><strong>Vacib.</strong> {WARNING}</p>}
        {s.note && <p className="guide-note">{s.note}</p>}
      </div>
    </details>
  );
}

export default function CompetitionGuide({ onClose }) {
  return (
    <Modal title="Yarışın keçirilmə təlimatı" onClose={onClose}>
      <div className="guide">
        <p className="guide-warn"><strong>Vacib.</strong> {WARNING}</p>
        {SECTIONS.map((s, i) => <Section key={s.title} s={s} open={i === 0} />)}
      </div>
    </Modal>
  );
}
