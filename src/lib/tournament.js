export const GENDERS = { oğlan: 'Oğlan', qız: 'Qız' };
export const TYPES = { esas: 'Əsas', teze: 'TƏZƏ' };
export const STATUSES = { qeydiyyat: 'Qeydiyyatda', cekildi: 'Çəkilib', kenar: 'Kənar' };
export const METHODS = ['İppon', 'Vaza-ari', 'Yuko', 'Qərar', 'Hansoku-make', 'Çəkilmə', 'Diskvalifikasiya'];

const norm = (s) => (s || '').trim().toLocaleLowerCase('az');

export function defaultAgeGroups(year) {
  return [8, 10, 12, 14, 16].map((n) => ({ code: `U${n}`, from: year - n + 1, to: year - n + 2 }));
}

export const HUNER_BOY_CLASSES = {
  U16: '-34, -38, -42, -46, -50, -55, -60, -66, -73, +73',
  U14: '-27, -30, -34, -38, -42, -46, -50, -55, -60, -66, +66',
  U12: '-24, -27, -30, -34, -38, -42, -46, -50, -55, +55',
  U10: '-19, -21, -24, -27, -30, -34, -38, -42, -46, +46',
  U8: '-19, -21, -24, -27, -30, -34, +34',
};

export const defaultClasses = (groups) => Object.fromEntries(
  groups.filter((g) => HUNER_BOY_CLASSES[g.code]).flatMap((g) => [
    [`${g.code}|oğlan`, HUNER_BOY_CLASSES[g.code]],
    [`${g.code}|qız`, HUNER_BOY_CLASSES[g.code]],
  ]),
);

export function readConfig(competition) {
  const year = Number((competition.held_on || '').slice(0, 4)) || new Date().getFullYear();
  const saved = competition.tournament || {};
  const age_groups = saved.age_groups?.length ? saved.age_groups : defaultAgeGroups(year);
  return {
    year,
    age_groups,
    classes: saved.classes || defaultClasses(age_groups),
    mats: Number(saved.mats) > 0 ? Number(saved.mats) : 1,
    start_time: /^\d{2}:\d{2}$/.test(saved.start_time || '') ? saved.start_time : '10:00',
    match_minutes: Math.min(30, Math.max(1, Number(saved.match_minutes) || 4)),
    bronze: ['two', 'match', 'repechage'].includes(saved.bronze) ? saved.bronze : 'repechage',
  };
}

const numToken = (n) => String(n).replace('.', '_');

export function parseClasses(text) {
  const out = [];
  let error = null;
  for (const raw of (text || '').split(/[\s,;]+/).filter(Boolean)) {
    const open = raw.startsWith('+');
    const num = Number(raw.replace(/^[+\-−–]/, '').replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) {
      error = `"${raw}" düzgün çəki deyil.`;
      continue;
    }
    out.push(open
      ? { token: `p${numToken(num)}`, label: `+${num} kq`, max: null, floor: num }
      : { token: `m${numToken(num)}`, label: `−${num} kq`, max: num, floor: null });
  }
  const bounded = out.filter((c) => c.max !== null).sort((a, b) => a.max - b.max);
  const opened = out.filter((c) => c.max === null).sort((a, b) => a.floor - b.floor).slice(-1);
  if (out.filter((c) => c.max === null).length > 1) error = error || 'Yalnız bir "+" kateqoriyası ola bilər.';
  return { classes: [...bounded, ...opened], error };
}

export function ageCodeOf(birthDate, groups) {
  const year = Number((birthDate || '').slice(0, 4));
  return groups.find((g) => year >= g.from && year <= g.to)?.code || null;
}

export const weightOf = (a) => {
  const w = a.weighed_kg ?? a.declared_kg;
  return w === null || w === undefined || w === '' ? null : Number(w);
};

function pickClass(weight, classes) {
  const bounded = classes.find((c) => c.max !== null && weight <= c.max);
  if (bounded) return bounded;
  return classes.find((c) => c.max === null && weight > c.floor) || null;
}

export function categoryOf(athlete, config) {
  const code = ageCodeOf(athlete.birth_date, config.age_groups);
  if (!code) return { key: null, problem: 'Doğum ili heç bir yaş qrupuna düşmür' };
  if (!GENDERS[athlete.gender]) return { key: null, problem: 'Cins seçilməyib' };
  const type = athlete.group_type === 'teze' ? 'teze' : 'esas';
  const base = `${code.toLowerCase()}-${athlete.gender === 'qız' ? 'q' : 'o'}-${type}`;
  const head = `${code} · ${GENDERS[athlete.gender]}${type === 'teze' ? ' · TƏZƏ' : ''}`;
  const own = config.classes[`${code}|${athlete.gender}`];
  const { classes } = parseClasses(own ?? (athlete.gender === 'qız' ? config.classes[`${code}|oğlan`] : undefined));
  if (!classes.length) return { key: `${base}-all`, label: head, code, type, cls: null, max: 0 };
  const weight = weightOf(athlete);
  if (weight === null) return { key: null, problem: 'Çəki yazılmayıb' };
  const cls = pickClass(weight, classes);
  if (!cls) return { key: null, problem: 'Çəki heç bir kateqoriyaya uyğun gəlmir' };
  return {
    key: `${base}-${cls.token}`,
    label: `${head} · ${cls.label}`,
    code, type, cls: cls.label, max: cls.max ?? cls.floor + 1000,
  };
}

export function groupCategories(athletes, config) {
  const map = new Map();
  const unassigned = [];
  const order = new Map(config.age_groups.map((g, i) => [g.code, i]));
  for (const a of athletes) {
    if (a.status === 'kenar') continue;
    const c = categoryOf(a, config);
    if (!c.key) {
      unassigned.push({ athlete: a, problem: c.problem });
      continue;
    }
    if (!map.has(c.key)) map.set(c.key, { ...c, athletes: [] });
    map.get(c.key).athletes.push(a);
  }
  const categories = [...map.values()].sort(
    (a, b) =>
      (order.get(a.code) ?? 99) - (order.get(b.code) ?? 99)
      || a.label.localeCompare(b.label, 'az')
      || a.max - b.max
      || (a.type === 'teze') - (b.type === 'teze'),
  );
  return { categories, unassigned };
}

export const bracketId = (competitionId, categoryKey) => `${competitionId}_${categoryKey}`;

export const athleteName = (a) => [a.last_name, a.first_name, a.father_name].filter(Boolean).join(' ');

const pow2 = (n) => {
  let s = 1;
  while (s < n) s *= 2;
  return s;
};

function seedOrder(size) {
  let order = [1, 2];
  for (let m = 4; m <= size; m *= 2) {
    const next = [];
    for (const s of order) next.push(s, m + 1 - s);
    order = next;
  }
  return order;
}

const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function conflictScore(slots, rounds) {
  let score = 0;
  for (let i = 0; i < slots.length; i += 1) {
    if (!slots[i]?.club) continue;
    for (let j = i + 1; j < slots.length; j += 1) {
      if (slots[j]?.club !== slots[i].club) continue;
      const round = Math.floor(Math.log2(i ^ j)) + 1;
      score += 1 << (rounds - round);
    }
  }
  return score;
}

const emptyMatch = (id, round, idx, extra = {}) => ({
  id, round, idx, a: null, b: null, winner: null, method: null, bye: false, ...extra,
});

function advance(bracket, match, winnerId, loserId) {
  const { rounds, matches } = bracket;
  if (bracket.system !== 'elimination') return;
  if (match.bronze || match.rep) return;
  if (match.round < rounds) {
    const next = matches.find((m) => isMain(m) && m.round === match.round + 1 && m.idx === match.idx >> 1);
    next[match.idx % 2 === 0 ? 'a' : 'b'] = winnerId;
  }
  if (match.round === rounds - 1) {
    const bronze = matches.find((m) => m.bronze && !m.rep);
    if (bronze) bronze[match.idx % 2 === 0 ? 'a' : 'b'] = loserId;
  }
}

export const placeLabel = (n) => `${n}-${{ 4: 'cü', 6: 'cı', 3: 'cü' }[n] || 'ci'}`;
export const isMain = (m) => !m.bronze && !m.rep;
const halfOf = (bracket, m) => m.idx >> (bracket.rounds - 1 - m.round);

function reviveMatch(previous, fresh) {
  if (previous && previous.a === fresh.a && previous.b === fresh.b) return previous;
  return fresh;
}

function syncRepechage(bracket) {
  if (!bracket.repechage || bracket.system !== 'elimination' || bracket.rounds < 2) return;
  const { rounds } = bracket;
  const keep = bracket.matches.filter((m) => !m.rep);
  const old = new Map(bracket.matches.filter((m) => m.rep).map((m) => [m.id, m]));
  const made = [];
  ['A', 'B'].forEach((side, h) => {
    const semi = keep.find((m) => isMain(m) && m.round === rounds - 1 && m.idx === h);
    if (!semi?.winner || semi.bye) return;
    const loser = semi.winner === semi.a ? semi.b : semi.a;
    const pool = keep
      .filter((m) => isMain(m) && !m.bye && m.round < rounds - 1 && halfOf(bracket, m) === h && m.winner === semi.winner)
      .sort((x, y) => x.round - y.round)
      .map((m) => (m.winner === m.a ? m.b : m.a));
    if (!pool.length) return;
    let carry = pool[0];
    for (let s = 1; s < pool.length; s += 1) {
      const id = `R${side}${s}`;
      const m = reviveMatch(old.get(id), emptyMatch(id, rounds - 1, h, { a: carry, b: pool[s], rep: true, side, step: s }));
      made.push(m);
      carry = m.winner;
    }
    const id = `B${side}`;
    made.push(reviveMatch(old.get(id), emptyMatch(id, rounds, h, { a: carry, b: loser, rep: true, bronze: true, side, step: pool.length })));
  });
  bracket.matches = [...keep, ...made];
}

function repLocked(bracket, match) {
  if (!bracket.repechage || bracket.system !== 'elimination') return;
  const repOf = (side) => bracket.matches.filter((m) => m.rep && m.side === side);
  if (match.rep) {
    if (repOf(match.side).some((m) => m.step > match.step && m.winner) || (!match.bronze && repOf(match.side).some((m) => m.bronze && m.winner))) {
      throw new Error('Növbəti görüş artıq keçirilib. Əvvəlcə onun nəticəsini silin.');
    }
    return;
  }
  if (match.bronze || match.round >= bracket.rounds) return;
  const side = halfOf(bracket, match) === 0 ? 'A' : 'B';
  if (repOf(side).some((m) => m.winner)) {
    throw new Error('Təsəllü görüşlər başlayıb. Əvvəlcə onların nəticəsini silin.');
  }
}

export function makeDraw(athletes, { bronze = 'two', tries = 400 } = {}) {
  const people = athletes.map((a) => ({ id: a.id, name: athleteName(a), club: norm(a.club_name), club_name: a.club_name || '' }));
  const base = { athletes: people.map(({ id, name, club_name }) => ({ id, name, club: club_name })), manual_places: {} };
  const n = people.length;

  if (n < 2) return { ...base, system: 'single', rounds: 0, matches: [] };

  if (n === 3) {
    const pairs = [[0, 1], [1, 2], [0, 2]];
    const matches = pairs.map(([i, j], k) => emptyMatch(`rr-${k}`, 1, k, { a: people[i].id, b: people[j].id }));
    return { ...base, system: 'round_robin', rounds: 1, matches };
  }

  const size = pow2(n);
  const rounds = Math.log2(size);
  const order = seedOrder(size);
  const slotOfSeed = new Map(order.map((seed, slot) => [seed, slot]));

  let best = null;
  let bestScore = Infinity;
  for (let t = 0; t < tries && bestScore > 0; t += 1) {
    const slots = new Array(size).fill(null);
    shuffled(people).forEach((p, i) => {
      slots[slotOfSeed.get(i + 1)] = p;
    });
    const score = conflictScore(slots, rounds);
    if (score < bestScore) {
      best = slots;
      bestScore = score;
    }
  }

  const matches = [];
  for (let r = 1; r <= rounds; r += 1) {
    for (let i = 0; i < size / (2 ** r); i += 1) matches.push(emptyMatch(`${r}-${i}`, r, i));
  }
  matches.filter((m) => m.round === 1).forEach((m) => {
    m.a = best[m.idx * 2]?.id || null;
    m.b = best[m.idx * 2 + 1]?.id || null;
  });
  if (bronze === 'match' && rounds >= 2) matches.push(emptyMatch('B', rounds, 1, { bronze: true }));

  const bracket = { ...base, system: 'elimination', rounds, matches, conflicts: bestScore };
  if (bronze === 'repechage' && rounds >= 2) bracket.repechage = true;
  for (const m of matches.filter((x) => x.round === 1 && (!x.a || !x.b))) {
    m.winner = m.a || m.b;
    m.bye = true;
    m.method = 'Bye';
    advance(bracket, m, m.winner, null);
  }
  syncRepechage(bracket);
  return bracket;
}

const matchById = (bracket, id) => bracket.matches.find((m) => m.id === id);

function nextOf(bracket, match) {
  if (bracket.system !== 'elimination' || match.bronze || match.rep) return [];
  const out = [];
  if (match.round < bracket.rounds) {
    out.push(bracket.matches.find((m) => isMain(m) && m.round === match.round + 1 && m.idx === match.idx >> 1));
  }
  if (match.round === bracket.rounds - 1) {
    const bronze = bracket.matches.find((m) => m.bronze && !m.rep);
    if (bronze) out.push(bronze);
  }
  return out;
}

export function setWinner(source, matchId, winnerId, method) {
  const bracket = structuredClone(source);
  const match = matchById(bracket, matchId);
  if (!match || !match.a || !match.b) throw new Error('Bu görüşün iştirakçıları hələ bəlli deyil.');
  if (winnerId !== match.a && winnerId !== match.b) throw new Error('Qalib bu görüşün iştirakçısı deyil.');
  if (match.winner && match.winner !== winnerId && nextOf(bracket, match).some((m) => m.winner)) {
    throw new Error('Növbəti görüş artıq keçirilib. Əvvəlcə onun nəticəsini silin.');
  }
  if (match.winner !== winnerId) repLocked(bracket, match);
  const loserId = winnerId === match.a ? match.b : match.a;
  match.winner = winnerId;
  match.method = method || null;
  advance(bracket, match, winnerId, loserId);
  syncRepechage(bracket);
  return bracket;
}

export function clearWinner(source, matchId) {
  const bracket = structuredClone(source);
  const match = matchById(bracket, matchId);
  if (!match || match.bye) throw new Error('Bu görüşün nəticəsi silinə bilməz.');
  const next = nextOf(bracket, match);
  if (next.some((m) => m.winner)) throw new Error('Növbəti görüş artıq keçirilib. Əvvəlcə onun nəticəsini silin.');
  repLocked(bracket, match);
  next.forEach((m) => {
    m[match.idx % 2 === 0 ? 'a' : 'b'] = null;
  });
  match.winner = null;
  match.method = null;
  syncRepechage(bracket);
  return bracket;
}

export function standings(bracket) {
  const rows = new Map(bracket.athletes.map((a) => [a.id, { id: a.id, wins: 0, played: 0 }]));
  for (const m of bracket.matches) {
    if (!m.winner) continue;
    [m.a, m.b].forEach((id) => {
      if (rows.has(id)) rows.get(id).played += 1;
    });
    rows.get(m.winner).wins += 1;
  }
  return [...rows.values()].sort((x, y) => y.wins - x.wins);
}

export function placements(bracket) {
  const names = new Map(bracket.athletes.map((a) => [a.id, a]));
  const place = (p, id) => ({ place: p, id, ...names.get(id) });

  if (bracket.system === 'single') {
    return { complete: bracket.athletes.length === 1, tie: false, places: bracket.athletes.map((a) => place(1, a.id)) };
  }

  if (bracket.system === 'round_robin') {
    const complete = bracket.matches.every((m) => m.winner);
    if (!complete) return { complete: false, tie: false, places: [] };
    const table = standings(bracket);
    const manual = bracket.manual_places || {};
    const tie = table.some((r, i) => i > 0 && r.wins === table[i - 1].wins) && !table.every((r) => manual[r.id]);
    const ordered = tie
      ? table
      : [...table].sort((x, y) => (manual[x.id] || 0) - (manual[y.id] || 0) || y.wins - x.wins);
    const useManual = table.every((r) => manual[r.id]);
    const final = useManual ? [...table].sort((x, y) => manual[x.id] - manual[y.id]) : ordered;
    return {
      complete: true,
      tie,
      table,
      places: tie ? [] : final.map((r, i) => place(useManual ? manual[r.id] : i + 1, r.id)),
    };
  }

  const final = bracket.matches.find((m) => isMain(m) && m.round === bracket.rounds);
  if (!final?.winner) return { complete: false, tie: false, places: [] };
  const places = [place(1, final.winner), place(2, final.winner === final.a ? final.b : final.a)];

  if (bracket.repechage) {
    let complete = true;
    ['A', 'B'].forEach((side, h) => {
      const semi = bracket.matches.find((m) => isMain(m) && m.round === bracket.rounds - 1 && m.idx === h);
      if (!semi?.winner) {
        complete = false;
        return;
      }
      const rep = bracket.matches.filter((m) => m.rep && m.side === side);
      const bronze = rep.find((m) => m.bronze);
      if (!bronze) {
        places.push(place(3, semi.winner === semi.a ? semi.b : semi.a));
        return;
      }
      if (!bronze.winner) {
        complete = false;
        return;
      }
      places.push(place(3, bronze.winner), place(5, bronze.winner === bronze.a ? bronze.b : bronze.a));
      const feeder = rep.filter((m) => !m.bronze).sort((x, y) => y.step - x.step)[0];
      if (feeder?.winner) places.push(place(7, feeder.winner === feeder.a ? feeder.b : feeder.a));
    });
    return { complete, tie: false, places: places.sort((x, y) => x.place - y.place) };
  }

  const bronzeMatch = bracket.matches.find((m) => m.bronze);
  if (bronzeMatch) {
    if (!bronzeMatch.winner) return { complete: false, tie: false, places };
    places.push(place(3, bronzeMatch.winner));
  } else if (bracket.rounds >= 2) {
    bracket.matches
      .filter((m) => m.round === bracket.rounds - 1 && m.winner)
      .forEach((m) => places.push(place(3, m.winner === m.a ? m.b : m.a)));
  }
  return { complete: true, tie: false, places };
}

export function roundName(bracket, match) {
  if (bracket.system === 'round_robin') return 'Dövrə görüşü';
  if (match.bronze) return 'Bürünc görüşü';
  if (match.rep) return 'Təsəllü görüş';
  const left = bracket.rounds - match.round;
  if (left === 0) return 'Final';
  if (left === 1) return 'Yarımfinal';
  return `1/${2 ** left} final`;
}

export function progress(bracket) {
  const real = bracket.matches.filter((m) => !m.bye);
  return { total: real.length, done: real.filter((m) => m.winner).length };
}

export function hasResults(bracket) {
  return bracket.matches.some((m) => m.winner && !m.bye);
}

export function medalTable(brackets) {
  const clubs = new Map();
  for (const b of brackets) {
    if (b.system === 'single') continue;
    const p = placements(b);
    if (!p.complete) continue;
    for (const r of p.places) {
      const club = r.club || '—';
      if (!clubs.has(club)) clubs.set(club, { club, gold: 0, silver: 0, bronze: 0 });
      const row = clubs.get(club);
      if (r.place === 1) row.gold += 1;
      else if (r.place === 2) row.silver += 1;
      else if (r.place === 3) row.bronze += 1;
    }
  }
  return [...clubs.values()].sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
}

export const emptySide = () => ({ ippon: 0, wazari: 0, yuko: 0, shido: 0 });
export const emptyScore = () => ({ a: emptySide(), b: emptySide() });

export const SCORE_LIMITS = { ippon: 1, wazari: 2, yuko: 9, shido: 3 };

export function decideFromScore(score) {
  const { a, b } = score || emptyScore();
  if (a.ippon && b.ippon) return { winner: null };
  if (a.ippon !== b.ippon) return { winner: a.ippon ? 'a' : 'b', method: 'İppon', final: true };
  if ((a.wazari >= 2) !== (b.wazari >= 2)) return { winner: a.wazari >= 2 ? 'a' : 'b', method: 'İppon', final: true };
  if ((a.shido >= 3) !== (b.shido >= 3)) return { winner: a.shido >= 3 ? 'b' : 'a', method: 'Hansoku-make', final: true };
  if (a.wazari !== b.wazari) return { winner: a.wazari > b.wazari ? 'a' : 'b', method: 'Vaza-ari', final: false };
  if (a.yuko !== b.yuko) return { winner: a.yuko > b.yuko ? 'a' : 'b', method: 'Yuko', final: false };
  return { winner: null };
}

export function setScore(source, matchId, score) {
  const bracket = structuredClone(source);
  const match = matchById(bracket, matchId);
  if (!match || !match.a || !match.b) throw new Error('Bu görüşün iştirakçıları hələ bəlli deyil.');
  if (match.winner) throw new Error('Nəticə təyin olunub. Balı dəyişmək üçün əvvəlcə nəticəni silin.');
  match.score = score;
  return bracket;
}

export const scoreLine = (side) => {
  if (!side) return '—';
  return [side.ippon ? 'İppon' : null, `V${side.wazari}`, `Y${side.yuko}`, `Ş${side.shido}`].filter(Boolean).join(' ');
};

export function scoreTotals(bracket) {
  const rows = new Map(bracket.athletes.map((a) => [a.id, { id: a.id, name: a.name, club: a.club, wins: 0, ippon: 0, wazari: 0, yuko: 0, shido: 0 }]));
  for (const m of bracket.matches) {
    if (m.bye || !m.a || !m.b) continue;
    if (m.winner) rows.get(m.winner).wins += 1;
    if (!m.score) continue;
    [['a', m.a], ['b', m.b]].forEach(([side, id]) => {
      const row = rows.get(id);
      Object.keys(SCORE_LIMITS).forEach((k) => {
        row[k] += m.score[side][k] || 0;
      });
    });
  }
  return [...rows.values()].sort((x, y) => y.wins - x.wins || y.ippon - x.ippon || y.wazari - x.wazari || y.yuko - x.yuko);
}

const orderKey = (bracket, m) => {
  if (m.rep) return m.bronze ? bracket.rounds - 0.05 : bracket.rounds - 1 + 0.1 * m.step;
  return m.bronze ? bracket.rounds + 1 : m.round;
};

export const orderedMatches = (bracket) => [...bracket.matches]
  .sort((x, y) => orderKey(bracket, x) - orderKey(bracket, y) || x.idx - y.idx);

export function matchNumbers(bracket) {
  const ordered = orderedMatches(bracket);
  return new Map(ordered.map((m, i) => [m.id, i + 1]));
}

export const scoreDigits = (side) => (side ? `${side.ippon}${side.wazari}${side.yuko}` : '000');

export function firstRoundSlots(bracket) {
  if (bracket.system !== 'elimination') return [];
  return bracket.matches
    .filter((m) => m.round === 1 && isMain(m))
    .sort((x, y) => x.idx - y.idx)
    .flatMap((m) => [m.a, m.b]);
}

const clock = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function buildSchedule(brackets, config) {
  const [h, m] = config.start_time.split(':').map(Number);
  const byMat = new Map();
  for (const b of brackets) {
    const mat = b.mat || 1;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat).push(b);
  }
  const slots = new Map();
  const ends = new Map();
  for (const [mat, list] of byMat) {
    list.sort((x, y) => x.label.localeCompare(y.label, 'az', { numeric: true }));
    let now = h * 60 + m;
    let order = 0;
    for (const b of list) {
      const games = orderedMatches(b).filter((x) => !x.bye);
      for (const game of games) {
        order += 1;
        slots.set(`${b.category_key}:${game.id}`, { mat, order, time: clock(now) });
        now += config.match_minutes;
      }
    }
    ends.set(mat, clock(now));
  }
  return { slots, ends };
}
