import {
  calcAge, formatPhone, fmtDate, fmtNum, fmtPeriod, fullName, gradeLabel, todayISO, slugify as slug, trainingDuration,
} from './format';
import { gamesOf } from './publish';
import {
  buildSchedule, firstRoundSlots, isMain, placeLabel, matchNumbers, orderedMatches, placements, roundName, scoreDigits,
} from './tournament';

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
  const name = settings?.club_name;
  return !name || name === brand ? brand : `${brand} ${name}`;
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

export async function debtorsPdf(rows, period, settings, group = '') {
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
  await save(buildDoc('Borclu uşaqlar', settings, content, { subtitle: `${fmtPeriod(period)}${group ? ` · Qrup ${group}` : ''}` }), `borclar-${period.slice(0, 7)}.pdf`);
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

export async function attendanceDayPdf(date, kids, present, settings, group = '') {
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
    buildDoc('Məşq davamiyyəti', settings, content, { subtitle: `${fmtDate(date)}${group ? ` · Qrup ${group}` : ''} · Gələn: ${came} / ${kids.length}` }),
    `davamiyyet-${date}.pdf`,
  );
}

export async function attendanceMonthPdf(period, rows, trainingDays, settings, group = '') {
  const body = rows.map((r, i) => [
    String(i + 1),
    fullName(r.child),
    { text: `${r.count} / ${trainingDays}`, alignment: 'right' },
    { text: `${r.percent}%`, alignment: 'right' },
  ]);
  await save(
    buildDoc('Aylıq davamiyyət', settings, [table([20, '*', 70, 50], ['№', 'Soyad, ad', 'Gəlib', 'Faiz'], body)], {
      subtitle: `${fmtPeriod(period)}${group ? ` · Qrup ${group}` : ''} · Məşq günü: ${trainingDays}`,
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

const GENDER_PDF = { oğlan: 'Oğlan', qız: 'Qız' };
const personName = (a) => [a.last_name, a.first_name, a.father_name].filter(Boolean).join(' ');

export async function tournamentRosterPdf(competition, categories, settings) {
  const content = [];
  categories.forEach((cat) => {
    content.push(section(`${cat.label} (${cat.athletes.length})`, [0, 10, 0, 4]));
    const rows = [...cat.athletes].sort((a, b) => personName(a).localeCompare(personName(b), 'az'));
    content.push(
      table(
        [20, '*', 52, 40, 110, 80],
        ['№', 'Soyad, ad, ata adı', 'Doğum', 'Çəki', 'Klub', 'Məşqçi'],
        rows.map((a, i) => [
          String(i + 1),
          personName(a),
          fmtDate(a.birth_date),
          dash(a.weighed_kg ?? a.declared_kg),
          dash(a.club_name),
          dash(a.coach),
        ]),
      ),
    );
  });
  if (!categories.length) content.push({ text: 'Kateqoriya yoxdur.', color: '#6b7788' });
  const total = categories.reduce((s, c) => s + c.athletes.length, 0);
  const subtitle = [fmtDate(competition.held_on), competition.location, `İştirakçı: ${total}`].filter(Boolean).join(' · ');
  await save(buildDoc(`${competition.name} · iştirakçı siyahısı`, settings, content, { subtitle }), `turnir-siyahi-${slug(competition.name)}.pdf`);
}

const PAGE_W = 842;
const PAGE_H = 595;
const EDGE = 30;
const LINE = '#222222';

const upperName = (full) => {
  const [last = '', ...rest] = (full || '').split(' ');
  return [last.toLocaleUpperCase('az'), ...rest].join(' ');
};
const shortName = (full) => {
  const [last = '', first = ''] = (full || '').split(' ');
  return `${last.toLocaleUpperCase('az')} ${first}`.trim();
};
const fit = (text, width, size) => {
  const max = Math.max(3, Math.floor(width / (size * 0.53)));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

function categoryTitle(label) {
  const [age = '', gender = '', weight = ''] = (label || '').split(' · ');
  const kg = weight.replace(/[−–]/g, '-').replace(/\s*kq$/i, '').replace(/\s+/g, '');
  const girls = gender.toLocaleLowerCase('az') === 'qız' ? ' QIZ' : '';
  return `${age}${kg} KG${girls}`.toLocaleUpperCase('az');
}

function sheetHeader(competition, label) {
  const when = [competition.location, fmtDate(competition.held_on)].filter(Boolean).join(', ').toLocaleUpperCase('az');
  return [
    { image: 'logo', width: 56, absolutePosition: { x: EDGE, y: 24 } },
    { text: (competition.name || '').toLocaleUpperCase('az'), bold: true, fontSize: 12, absolutePosition: { x: EDGE + 68, y: 30 } },
    { text: when, color: '#444444', fontSize: 10, absolutePosition: { x: EDGE + 68, y: 48 } },
    {
      columns: [{ width: '*', text: '' }, { width: 330, text: label, alignment: 'right', bold: true, fontSize: 20 }],
      absolutePosition: { x: PAGE_W - EDGE - 330 - 8, y: 28 },
    },
    { canvas: [{ type: 'line', x1: EDGE, y1: 84, x2: PAGE_W - EDGE, y2: 84, lineWidth: 1, lineColor: LINE }], absolutePosition: { x: 0, y: 0 } },
  ];
}

function participantsPage(bracket, order) {
  const rows = order.map((id, i) => {
    const p = bracket.athletes.find((a) => a.id === id);
    return [{ text: String(i + 1), alignment: 'center' }, upperName(p?.name), dash(p?.club)];
  });
  return {
    margin: [0, 78, 0, 0],
    table: {
      headerRows: 1,
      widths: [34, '*', 230],
      body: [
        ['Num.', 'İştirakçı', 'Klub'].map((t) => ({ text: t, bold: true, fillColor: '#cfe6bd' })),
        ...rows,
      ],
    },
    layout: { hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => LINE, vLineColor: () => LINE, paddingTop: () => 3, paddingBottom: () => 3 },
  };
}

function bracketSheet(bracket, numbers) {
  const R = bracket.rounds;
  const size = 2 ** R;
  const top = 100;
  const slotH = Math.min(26, Math.floor((PAGE_H - top - 44) / size));
  const fs = Math.max(4.5, Math.min(9, slotH * 0.6));
  const noW = 24;
  const boxL = EDGE + noW;
  const boxW = 176;
  const boxR = boxL + boxW;
  const colW = Math.min(118, (PAGE_W - EDGE - boxR) / (R + 0.6));
  const xj = (r) => boxR + (r - 1) * colW;
  const cy = (r, i) => top + (i * 2 ** r + 2 ** (r - 1)) * slotH;
  const nameOf = (id) => bracket.athletes.find((a) => a.id === id);
  const lines = [];
  const nodes = [];
  const seg = (x1, y1, x2, y2, w = 0.9) => lines.push({ type: 'line', x1, y1, x2, y2, lineWidth: w, lineColor: LINE });
  const text = (x, y, t, o = {}) => nodes.push({ text: t, fontSize: fs, absolutePosition: { x, y }, ...o });
  const rightText = (xr, y, t, o = {}) => nodes.push({
    columns: [{ width: 40, text: t, alignment: 'right', fontSize: fs, ...o }], absolutePosition: { x: xr - 40, y },
  });

  const byRound = (r) => bracket.matches.filter((m) => m.round === r && isMain(m)).sort((x, y) => x.idx - y.idx);

  byRound(1).forEach((m) => {
    const y0 = top + m.idx * 2 * slotH;
    lines.push({ type: 'rect', x: EDGE, y: y0, w: noW, h: slotH * 2, lineWidth: 0.9, lineColor: LINE });
    lines.push({ type: 'rect', x: boxL, y: y0, w: boxW, h: slotH * 2, lineWidth: 0.9, lineColor: LINE });
    lines.push({ type: 'rect', x: boxL, y: y0 + slotH, w: boxW, h: slotH, color: '#ececec', lineWidth: 0.9, lineColor: LINE });
    nodes.push({
      columns: [{ width: noW, text: String(numbers.get(m.id)), alignment: 'center', fontSize: fs }],
      absolutePosition: { x: EDGE, y: y0 + slotH - fs * 0.6 },
    });
    [m.a, m.b].forEach((id, k) => {
      const p = nameOf(id);
      if (p) text(boxL + 4, y0 + k * slotH + (slotH - fs) / 2 - 0.5, fit(upperName(p.name), boxW - 8, fs));
    });
  });

  for (let r = 1; r <= R; r += 1) {
    byRound(r).forEach((m) => {
      const y = cy(r, m.idx);
      const x1 = xj(r);
      const x2 = xj(r + 1);
      seg(x1, y, x2, y, 1);
      const w = nameOf(m.winner);
      if (w) text(x1 + 3, y - fs - 1.5, fit(shortName(w.name), colW - 6, fs));
      if (r < R && m.idx % 2 === 0) {
        const sibling = cy(r, m.idx + 1);
        seg(x2, y, x2, sibling, 1);
        const parent = byRound(r + 1)[m.idx >> 1];
        rightText(x2 - 3, (y + sibling) / 2 - fs / 2, String(numbers.get(parent.id)));
      }
    });
  }
  text(xj(R + 1) - fs * 1.8, cy(R, 0) + 2, '1.', { bold: true });

  const bronze = bracket.matches.find((m) => m.bronze && !m.rep);
  const done = placements(bracket);
  const foot = [];
  const rep = orderedMatches(bracket).filter((m) => m.rep);
  if (rep.length) {
    const lineH = fs + 3;
    const bx = PAGE_W - EDGE - 250;
    const y0 = PAGE_H - 36 - (rep.length + 1) * lineH;
    text(bx, y0, 'Təsəlliverici və bürünc görüşləri', { bold: true });
    rep.forEach((m, k) => {
      const a = nameOf(m.a);
      const b = nameOf(m.b);
      const win = nameOf(m.winner);
      const row = `${numbers.get(m.id)}.  ${a ? shortName(a.name) : '—'}  —  ${b ? shortName(b.name) : '—'}${win ? `   (${shortName(win.name)})` : ''}`;
      text(bx, y0 + (k + 1) * lineH, fit(row, 250, fs));
    });
  }
  if (bronze) {
    const yb = PAGE_H - 62;
    const bx = PAGE_W - EDGE - 250;
    text(bx, yb - fs - 4, 'Bürünc görüşü', { bold: true });
    lines.push({ type: 'rect', x: bx, y: yb, w: 250, h: slotH * 2, lineWidth: 0.9, lineColor: LINE });
    seg(bx, yb + slotH, bx + 250, yb + slotH, 0.9);
    [bronze.a, bronze.b].forEach((id, k) => {
      const p = nameOf(id);
      if (p) text(bx + 4, yb + k * slotH + (slotH - fs) / 2, fit(upperName(p.name), 240, fs));
    });
  }
  if (done.complete) {
    foot.push({
      text: done.places.map((p) => `${p.place}. ${shortName(p.name)}`).join('    '),
      fontSize: 9, absolutePosition: { x: EDGE, y: PAGE_H - 30 },
    });
  }
  return [{ canvas: lines, absolutePosition: { x: 0, y: 0 } }, ...nodes, ...foot];
}

function roundRobinSheet(bracket, numbers) {
  const body = bracket.matches.map((m) => {
    const a = bracket.athletes.find((p) => p.id === m.a);
    const b = bracket.athletes.find((p) => p.id === m.b);
    const win = bracket.athletes.find((p) => p.id === m.winner);
    return [{ text: String(numbers.get(m.id)), alignment: 'center' }, upperName(a?.name), upperName(b?.name), win ? upperName(win.name) : ''];
  });
  return {
    margin: [0, 16, 0, 0],
    table: {
      headerRows: 1,
      widths: [34, '*', '*', '*'],
      body: [['Num.', 'Qırmızı / ağ', 'Mavi', 'Qalib'].map((t) => ({ text: t, bold: true, fillColor: '#cfe6bd' })), ...body],
    },
    layout: { hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => LINE, vLineColor: () => LINE, paddingTop: () => 3, paddingBottom: () => 3 },
  };
}

export function tournamentDrawDoc(competition, brackets) {
  const content = [];
  const sorted = [...brackets].sort((a, b) => (a.mat || 99) - (b.mat || 99) || a.label.localeCompare(b.label, 'az', { numeric: true }));
  sorted.forEach((b, i) => {
    const numbers = matchNumbers(b);
    const label = `${categoryTitle(b.label)} (${b.athletes.length})`;
    const order = b.system === 'elimination' ? firstRoundSlots(b).filter(Boolean) : b.athletes.map((a) => a.id);
    content.push({ text: '', ...(i ? { pageBreak: 'before' } : {}) });
    content.push(...sheetHeader(competition, label));
    content.push(participantsPage(b, order));
    if (b.system === 'round_robin') content.push(roundRobinSheet(b, numbers));
    if (b.system === 'elimination') {
      content.push({ text: '', pageBreak: 'before' });
      content.push(...sheetHeader(competition, label));
      content.push(...bracketSheet(b, numbers));
    }
  });
  if (!sorted.length) content.push({ text: 'Püşkatma keçirilməyib.', color: '#6b7788' });
  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [EDGE, EDGE, EDGE, EDGE],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, color: '#111111' },
    content,
  };
}

export async function tournamentDrawPdf(competition, brackets) {
  const only = brackets.length === 1 ? brackets[0].label : competition.name;
  await save(tournamentDrawDoc(competition, brackets), `puskatma-${slug(only)}.pdf`);
}

const signature = (title) => ({
  stack: [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: '#16202e' }] },
    { text: title, fontSize: 8.5, color: '#5b6879', margin: [0, 3, 0, 0] },
  ],
});

function gameRows(bracket) {
  const numbers = matchNumbers(bracket);
  const name = (id) => bracket.athletes.find((x) => x.id === id)?.name || '—';
  return bracket.matches
    .filter((m) => !m.bye && m.a && m.b && m.winner)
    .sort((x, y) => numbers.get(x.id) - numbers.get(y.id))
    .map((m) => {
      const aWon = m.winner === m.a;
      const win = aWon ? m.score?.a : m.score?.b;
      const lose = aWon ? m.score?.b : m.score?.a;
      return [
        String(numbers.get(m.id)),
        roundName(bracket, m),
        name(m.winner),
        name(aWon ? m.b : m.a),
        dash(m.method),
        m.score ? `${scoreDigits(win)} : ${scoreDigits(lose)}` : '—',
      ];
    });
}

export function tournamentProtocolDoc(competition, brackets, medals, settings) {
  const content = [];
  const NAMES = { 1: 'Qızıl', 2: 'Gümüş', 3: 'Bürünc' };
  const sorted = [...brackets].sort((a, b) => a.label.localeCompare(b.label, 'az', { numeric: true }));
  const people = new Set(sorted.flatMap((b) => b.athletes.map((a) => a.id)));
  const facts = [
    competition.location ? `Yer: ${competition.location}` : null,
    `İştirakçı: ${people.size}`,
    `Kateqoriya: ${sorted.length}`,
  ].filter(Boolean);
  content.push({ text: facts.join('   ·   '), alignment: 'center', color: '#3b475a', margin: [0, 0, 0, 4] });

  if (medals.length) {
    content.push(section('Klub üzrə medallar', [0, 10, 0, 4]));
    content.push(
      table(
        [20, '*', 50, 50, 50],
        ['№', 'Klub', 'Qızıl', 'Gümüş', 'Bürünc'],
        medals.map((m, i) => [String(i + 1), m.club, String(m.gold), String(m.silver), String(m.bronze)]),
      ),
    );
  }
  sorted.forEach((b) => {
    const r = placements(b);
    if (!r.places.length) return;
    content.push(section(b.label, [0, 12, 0, 4]));
    content.push(
      table(
        [60, '*', 150],
        ['Yer', 'İdmançı', 'Klub'],
        r.places.map((p) => [NAMES[p.place] || placeLabel(p.place), p.name, dash(p.club)]),
      ),
    );
    const games = gameRows(b);
    if (games.length) {
      content.push({ text: 'Görüşlər (bal: İppon, Vaza-ari, Yuko)', fontSize: 8.5, color: '#5b6879', margin: [0, 8, 0, 3] });
      content.push(table([22, 70, '*', '*', 62, 48], ['№', 'Mərhələ', 'Qalib', 'Məğlub', 'Üsul', 'Bal'], games));
    }
  });
  if (content.length === 1) content.push({ text: 'Nəticə yoxdur.', color: '#6b7788', alignment: 'center' });
  content.push({
    columns: [signature('Baş hakim'), signature('Baş katib')],
    columnGap: 60,
    margin: [0, 46, 0, 0],
    unbreakable: true,
  });
  return buildDoc(`${competition.name} · protokol`, settings, content, { subtitle: fmtDate(competition.held_on) });
}

export async function tournamentResultsPdf(competition, brackets, medals, settings) {
  await save(tournamentProtocolDoc(competition, brackets, medals, settings), `protokol-${slug(competition.name)}.pdf`);
}

const normClub = (s) => (s || '').trim().toLocaleLowerCase('az');

export function tournamentScheduleDoc(competition, athletes, brackets, config) {
  const schedule = buildSchedule(brackets, config);
  const inDraw = new Set(brackets.flatMap((b) => b.athletes.map((a) => a.id)));
  const clubs = new Map();
  for (const a of athletes) {
    if (!inDraw.has(a.id)) continue;
    const key = normClub(a.club_name);
    if (!clubs.has(key)) clubs.set(key, { name: a.club_name || 'Klubsuz', people: [] });
    clubs.get(key).people.push({ name: personName(a), ...gamesOf(a.id, brackets, schedule) });
  }
  const content = [];
  const list = [...clubs.values()].sort((x, y) => x.name.localeCompare(y.name, 'az'));
  list.forEach((club, i) => {
    club.people.sort((x, y) => x.name.localeCompare(y.name, 'az'));
    content.push({ text: competition.name, bold: true, fontSize: 15, color: TITLE_COLOR, ...(i ? { pageBreak: 'before' } : {}) });
    content.push({ text: [competition.held_on ? fmtDate(competition.held_on) : null, competition.location].filter(Boolean).join(' · '), color: '#5b6879', margin: [0, 2, 0, 0] });
    content.push({ text: `${club.name} · görüş cədvəli`, bold: true, fontSize: 13, color: SECTION_COLOR, margin: [0, 10, 0, 4] });
    content.push({ text: 'Saatlar təxminidir, əvvəlki görüşlər uzansa və ya tez bitsə dəyişə bilər. Növbəti mərhələlərin rəqibi əvvəlki görüşlərin nəticəsindən asılıdır.', fontSize: 8.5, color: '#6b7788', margin: [0, 0, 0, 6] });
    for (const p of club.people) {
      const body = p.games.map((g) => [
        String(g.number), g.mat ? `Tatami ${g.mat}` : '—', dash(g.time), g.round,
        g.opponent_club ? `${g.opponent} (${g.opponent_club})` : g.opponent,
      ]);
      content.push({
        unbreakable: true,
        margin: [0, 8, 0, 0],
        stack: [
          { text: [{ text: p.name, bold: true, fontSize: 11 }, { text: `   ${p.category || ''}`, color: '#5b6879' }] },
          p.games.length
            ? table([34, 60, 40, 80, '*'], ['Görüş №', 'Tatami', 'Saat', 'Mərhələ', 'Rəqib'], body, { margin: [0, 3, 0, 0] })
            : { text: p.bye ? 'Birinci mərhələni keçir (rəqibsiz). Növbəti görüşü əvvəlki görüşlərin nəticəsindən sonra bəlli olacaq.' : 'Görüşü yoxdur.', color: '#6b7788', margin: [0, 3, 0, 0] },
        ],
      });
    }
  });
  if (!list.length) content.push({ text: 'Püşkatma keçirilməyib.', color: '#6b7788' });
  return {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: 'Roboto', fontSize: 9.5, color: '#111111' },
    content,
  };
}

export async function tournamentSchedulePdf(competition, athletes, brackets, config) {
  await save(tournamentScheduleDoc(competition, athletes, brackets, config), `mesqci-cedveli-${slug(competition.name)}.pdf`);
}
