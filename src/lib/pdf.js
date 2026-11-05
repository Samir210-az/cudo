import {
  calcAge, formatPhone, fmtDate, fmtNum, fmtPeriod, fullName, gradeLabel, todayISO, slugify as slug, trainingDuration,
} from './format';

let engine;
function loadEngine() {
  if (!engine) {
    engine = Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(
      ([pm, fonts]) => {
        const pdfMake = pm.default || pm;
        pdfMake.vfs = fonts.pdfMake?.vfs ?? fonts.default?.pdfMake?.vfs ?? fonts.default ?? fonts;
        return pdfMake;
      },
    );
  }
  return engine;
}

const money = (n) => `${fmtNum(n)} AZN`;
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

const tableLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0,
  hLineColor: () => '#d3d9e2',
  fillColor: (row) => (row === 0 ? '#eef1f6' : null),
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

const head = (cells) => cells.map((text) => ({ text, bold: true, fontSize: 8.5, color: '#3b475a' }));

function table(widths, header, body, extra = {}) {
  return {
    table: { headerRows: 1, widths, body: [head(header), ...body] },
    layout: tableLayout,
    ...extra,
  };
}

const TITLE_COLOR = '#c3112b';
const SECTION_COLOR = '#1f4fa3';

const section = (text, margin = [0, 14, 0, 6]) => ({
  text,
  alignment: 'center',
  bold: true,
  fontSize: 12,
  color: SECTION_COLOR,
  headlineLevel: 1,
  margin,
});

function clubTitle(settings) {
  const brand = settings?.brand_name || 'HÜNƏR İDMAN KLUBU';
  return settings?.is_branch ? `${brand} ${settings.club_name}` : settings?.club_name || brand;
}

function buildDoc(title, settings, content, { landscape = false, subtitle } = {}) {
  const club = clubTitle(settings);
  return {
    pageSize: 'A4',
    pageOrientation: landscape ? 'landscape' : 'portrait',
    pageMargins: [36, 36, 36, 46],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, color: '#16202e' },
    pageBreakBefore: (node, following) => node.headlineLevel === 1 && following.length === 0,
    footer: (page, pages) => ({
      columns: [
        { text: `${club} · ${fmtDate(todayISO())}`, color: '#6b7788' },
        { text: `${page} / ${pages}`, alignment: 'right', color: '#6b7788' },
      ],
      margin: [36, 14, 36, 0],
      fontSize: 8,
    }),
    content: [
      { image: 'logo', width: 96, alignment: 'center' },
      { text: club, fontSize: 14, bold: true, alignment: 'center', color: '#0e1a2b', margin: [0, 6, 0, 8] },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: landscape ? 770 : 523, y2: 0, lineWidth: 1.2, lineColor: TITLE_COLOR }],
        margin: [0, 0, 0, 10],
      },
      { text: title, fontSize: 18, bold: true, alignment: 'center', color: TITLE_COLOR, margin: [0, 0, 0, subtitle ? 2 : 14] },
      ...(subtitle ? [{ text: subtitle, alignment: 'center', color: '#5b6879', margin: [0, 0, 0, 14] }] : []),
      ...content,
    ],
  };
}

let logoData;
function loadLogo() {
  if (!logoData) {
    logoData = fetch('/logo-pdf.png')
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      );
  }
  return logoData;
}

async function save(definition, filename) {
  const [pdfMake, logo] = await Promise.all([loadEngine(), loadLogo()]);
  pdfMake.createPdf({ ...definition, images: { logo } }).download(filename);
}

export async function childrenListPdf(children, settings, { withId = false } = {}) {
  const header = ['№', 'Soyad, ad, ata adı', 'Doğum', 'Yaş', 'Sinif / məktəb', 'Başlama', 'Müddət', 'Kəmər', 'Valideyn'];
  const widths = [18, '*', 52, 22, 100, 52, 56, 40, 90];
  if (withId) {
    header.push('Vəsiqə №');
    widths.push(78);
  }
  const body = children.map((c, i) => {
    const row = [
      String(i + 1),
      [fullName(c), c.father_name].filter(Boolean).join(' '),
      fmtDate(c.birth_date),
      String(calcAge(c.birth_date)),
      [c.grade !== null ? gradeLabel(c.grade) : null, c.school].filter(Boolean).join(', ') || '—',
      fmtDate(c.joined_at),
      trainingDuration(c.joined_at),
      dash(c.belt),
      [c.parent_name, c.parent_phone ? formatPhone(c.parent_phone) : null].filter(Boolean).join(', ') || '—',
    ];
    if (withId) row.push(dash(c.id_series));
    return row;
  });
  const def = buildDoc('Uşaqların siyahısı', settings, [table(widths, header, body)], {
    landscape: true,
    subtitle: `Cəmi: ${children.length} uşaq`,
  });
  def.defaultStyle.fontSize = 8.5;
  await save(def, `usaqlar-${todayISO()}.pdf`);
}

export async function childCardPdf(child, { entries, payments }, settings) {
  const pair = (k, v) => [{ text: k, color: '#5b6879' }, { text: dash(v), bold: true }];
  const info = [
    pair('Soyad, ad', fullName(child)),
    pair('Ata adı', child.father_name),
    pair('Doğum tarixi', `${fmtDate(child.birth_date)} (${calcAge(child.birth_date)} yaş)`),
    pair('Cins', child.gender),
    pair('Vəsiqə seriya və nömrəsi', child.id_series),
    pair('FİN', child.id_fin),
    pair('Məktəb', child.school),
    pair('Sinif', gradeLabel(child.grade)),
    pair('Klubda qeydiyyat', fmtDate(child.joined_at)),
    pair('Məşğul olur', trainingDuration(child.joined_at)),
    pair('Kəmər', child.belt),
    pair('Çəki', child.weight_kg ? `${child.weight_kg} kq` : null),
    pair('Valideyn', child.parent_name),
    pair('Valideyn telefonu', child.parent_phone ? formatPhone(child.parent_phone) : null),
    pair('Ünvan', child.address),
    pair('Aylıq ödəniş', money(child.monthly_fee)),
    pair('Status', child.status),
  ];
  const content = [
    {
      table: { widths: [150, '*'], body: info },
      layout: { ...tableLayout, fillColor: () => null },
    },
  ];
  if (child.note) content.push({ text: `Qeyd: ${child.note}`, margin: [0, 8, 0, 0] });

  content.push(section('Yarışlar', [0, 16, 0, 6]));
  content.push(
    entries.length
      ? table(
          ['*', 70, 80, 70],
          ['Yarış', 'Tarix', 'Kateqoriya', 'Nəticə'],
          entries.map((e) => [e.competitions.name, fmtDate(e.competitions.held_on), dash(e.category), dash(e.result)]),
        )
      : { text: 'Yarış iştirakı yoxdur.', color: '#6b7788' },
  );

  content.push(section('Ödənişlər', [0, 16, 0, 6]));
  content.push(
    payments.length
      ? table(
          ['*', 70, 70, 70],
          ['Hansı ay üçün', 'Ödəniş tarixi', 'Üsul', 'Məbləğ'],
          payments.map((p) => [fmtPeriod(p.period_month), fmtDate(p.paid_on), p.method, { text: money(p.amount), alignment: 'right' }]),
        )
      : { text: 'Ödəniş qeydi yoxdur.', color: '#6b7788' },
  );

  await save(buildDoc('Uşaq kartı', settings, content), `kart-${slug(fullName(child))}.pdf`);
}

export async function competitionPdf(competition, entries, settings) {
  const groups = new Map();
  for (const e of entries) {
    const key = e.category?.trim() || 'Kateqoriya təyin edilməyib';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const content = [];
  [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'az', { numeric: true }))
    .forEach(([name, rows]) => {
      content.push(section(`${name} (${rows.length})`, [0, 10, 0, 4]));
      content.push(
        table(
          [20, '*', 30, 44, 70],
          ['№', 'Soyad, ad', 'Yaş', 'Çəki', 'Nəticə'],
          rows.map((e, i) => [
            String(i + 1),
            fullName(e.children),
            String(calcAge(e.children.birth_date)),
            e.children.weight_kg ? `${e.children.weight_kg} kq` : '—',
            dash(e.result),
          ]),
        ),
      );
    });
  if (!entries.length) content.push({ text: 'İştirakçı əlavə edilməyib.', color: '#6b7788' });

  const subtitle = [fmtDate(competition.held_on), competition.location, `İştirakçı: ${entries.length}`]
    .filter(Boolean)
    .join(' · ');
  await save(buildDoc(competition.name, settings, content, { subtitle }), `yaris-${slug(competition.name)}.pdf`);
}

export async function debtorsPdf(rows, period, settings) {
  const total = rows.reduce((s, r) => s + r.due, 0);
  const body = rows.map((r, i) => [
    String(i + 1),
    fullName(r.child),
    r.child.parent_phone ? formatPhone(r.child.parent_phone) : '—',
    { text: money(r.fee), alignment: 'right' },
    { text: money(r.paid), alignment: 'right' },
    { text: money(r.due), alignment: 'right', bold: true },
  ]);
  const content = [
    rows.length
      ? table([20, '*', 80, 60, 60, 66], ['№', 'Soyad, ad', 'Valideyn tel.', 'Aylıq', 'Ödənilib', 'Borc'], body)
      : { text: 'Bu ay üzrə borc yoxdur.', color: '#6b7788' },
    { text: `Ümumi borc: ${money(total)}`, bold: true, alignment: 'right', margin: [0, 10, 0, 0] },
  ];
  await save(buildDoc('Borclu uşaqlar', settings, content, { subtitle: fmtPeriod(period) }), `borclar-${period.slice(0, 7)}.pdf`);
}

export async function financeReportPdf(report, settings) {
  const { title, income, expenseTotal, net, categories, monthly, payments, expenses, salaries } = report;
  const content = [
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          ['Gəlir (uşaq ödənişləri)', { text: money(income), alignment: 'right', bold: true }],
          ['Xərclər (əmək haqqı daxil)', { text: money(expenseTotal), alignment: 'right', bold: true }],
          [{ text: 'Xalis nəticə', bold: true }, { text: money(net), alignment: 'right', bold: true, color: net < 0 ? '#c3112b' : '#14804a' }],
        ],
      },
      layout: tableLayout,
    },
    section('Xərclər kateqoriyalar üzrə'),
    categories.length
      ? table(['*', 90], ['Kateqoriya', 'Məbləğ'], categories.map(([name, value]) => [name, { text: money(value), alignment: 'right' }]))
      : { text: 'Xərc yoxdur.', color: '#6b7788' },
  ];

  if (monthly) {
    content.push(section('Aylar üzrə'));
    content.push(
      table(
        ['*', 80, 80, 80],
        ['Ay', 'Gəlir', 'Xərc', 'Nəticə'],
        monthly.map((m) => [
          m.label,
          { text: money(m.income), alignment: 'right' },
          { text: money(m.expense), alignment: 'right' },
          { text: money(m.income - m.expense), alignment: 'right' },
        ]),
      ),
    );
  }

  const detail = (label, rows, header, widths, mapper) => {
    if (!rows.length) return;
    content.push(section(label));
    content.push(table(widths, header, rows.map(mapper)));
  };

  detail('Ödənişlər', payments, ['Tarix', 'Uşaq', 'Hansı ay', 'Məbləğ'], [60, '*', 80, 70], (p) => [
    fmtDate(p.paid_on), fullName(p.children), fmtPeriod(p.period_month), { text: money(p.amount), alignment: 'right' },
  ]);
  detail('Xərclər', expenses, ['Tarix', 'Kateqoriya', 'Qeyd', 'Məbləğ'], [60, 110, '*', 70], (x) => [
    fmtDate(x.spent_on), x.category, dash(x.note), { text: money(x.amount), alignment: 'right' },
  ]);
  detail('Əmək haqqı', salaries, ['Tarix', 'İşçi', 'Hansı ay', 'Məbləğ'], [60, '*', 80, 70], (s) => [
    fmtDate(s.paid_on), s.staff.full_name, fmtPeriod(s.period_month), { text: money(s.amount), alignment: 'right' },
  ]);

  await save(buildDoc('Maliyyə hesabatı', settings, content, { subtitle: title }), `hesabat-${slug(title)}.pdf`);
}

export async function attendanceDayPdf(date, kids, present, settings) {
  const came = kids.filter((k) => present.has(k.id)).length;
  const body = kids.map((k, i) => [
    String(i + 1),
    fullName(k),
    { text: present.has(k.id) ? 'Gəlib' : '—', alignment: 'center', bold: present.has(k.id) },
  ]);
  const content = [
    kids.length ? table([20, '*', 70], ['№', 'Soyad, ad', 'Davamiyyət'], body) : { text: 'Aktiv uşaq yoxdur.', color: '#6b7788' },
  ];
  await save(
    buildDoc('Məşq davamiyyəti', settings, content, { subtitle: `${fmtDate(date)} · Gələn: ${came} / ${kids.length}` }),
    `davamiyyet-${date}.pdf`,
  );
}

export async function attendanceMonthPdf(period, rows, trainingDays, settings) {
  const body = rows.map((r, i) => [
    String(i + 1),
    fullName(r.child),
    { text: `${r.count} / ${trainingDays}`, alignment: 'right' },
    { text: `${r.percent}%`, alignment: 'right' },
  ]);
  await save(
    buildDoc('Aylıq davamiyyət', settings, [table([20, '*', 70, 50], ['№', 'Soyad, ad', 'Gəlib', 'Faiz'], body)], {
      subtitle: `${fmtPeriod(period)} · Məşq günü: ${trainingDays}`,
    }),
    `davamiyyet-${period.slice(0, 7)}.pdf`,
  );
}

export async function overallReportPdf({ title, rows, totals, brand }) {
  const cell = (n, extra = {}) => ({ text: money(n), alignment: 'right', ...extra });
  const content = [
    section('Filiallar üzrə gəlir və xərc', [0, 0, 0, 6]),
    table(
      ['*', 80, 80, 80],
      ['Filial', 'Gəlir', 'Xərc', 'Xalis'],
      [
        ...rows.map((r) => [r.club.club_name, cell(r.income), cell(r.expense), cell(r.net)]),
        [
          { text: 'Cəmi', bold: true },
          cell(totals.income, { bold: true }),
          cell(totals.expense, { bold: true }),
          cell(totals.net, { bold: true, color: totals.net < 0 ? '#c3112b' : '#14804a' }),
        ],
      ],
    ),
    section('Cari ay üzrə ödəniş borcu'),
    table(
      ['*', 70, 60, 80],
      ['Filial', 'Aktiv uşaq', 'Borclu', 'Borc'],
      [
        ...rows.map((r) => [r.club.club_name, { text: String(r.active), alignment: 'right' }, { text: String(r.debtors), alignment: 'right' }, cell(r.debt)]),
        [
          { text: 'Cəmi', bold: true },
          { text: String(totals.active), alignment: 'right', bold: true },
          { text: String(rows.reduce((n, r) => n + r.debtors, 0)), alignment: 'right', bold: true },
          cell(totals.debt, { bold: true }),
        ],
      ],
    ),
  ];
  await save(
    buildDoc('Ümumi maliyyə hesabatı', { club_name: brand, brand_name: brand }, content, { subtitle: title }),
    `umumi-hesabat-${slug(title)}.pdf`,
  );
}
