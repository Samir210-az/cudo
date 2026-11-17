import { list } from './db';
import { placements } from './tournament';

export const RECENT_DAYS = 30;
const DAY = 86400000;
const norm = (s) => (s || '').trim().toLocaleLowerCase('az');
const personKey = (p) => `${norm(p.last_name)}|${norm(p.first_name)}|${p.birth_date || ''}`;

export function medalMap(brackets) {
  const medals = new Map();
  for (const bracket of brackets) {
    if (bracket.system === 'single') continue;
    const result = placements(bracket);
    if (result.tie) continue;
    for (const p of result.places) {
      if (p.place <= 3) medals.set(p.id, p.place);
    }
  }
  return medals;
}

const isRecent = (heldOn, now) => {
  const held = Date.parse(heldOn);
  if (Number.isNaN(held)) return false;
  const age = now - held;
  return age >= 0 && age <= RECENT_DAYS * DAY;
};

export async function recentChildMedals(now = Date.now()) {
  const competitions = (await list('competitions')).filter((c) => isRecent(c.held_on, now + DAY));
  if (!competitions.length) return { for: () => [] };
  const [athletes, brackets] = await Promise.all([list('tournamentAthletes'), list('tournamentBrackets')]);
  const recent = new Map(competitions.map((c) => [c.id, c]));
  const byChild = new Map();
  const add = (key, entry) => {
    if (!byChild.has(key)) byChild.set(key, []);
    byChild.get(key).push(entry);
  };
  for (const [competitionId, competition] of recent) {
    const medals = medalMap(brackets.filter((b) => b.competition_id === competitionId));
    for (const a of athletes) {
      const place = medals.get(a.id);
      if (a.competition_id !== competitionId || !place) continue;
      const entry = { place, competition: competition.name };
      if (a.child_id) add(`id:${a.child_id}`, entry);
      add(`name:${personKey(a)}`, entry);
    }
  }
  return {
    for(child) {
      const found = byChild.get(`id:${child.id}`) || byChild.get(`name:${personKey(child)}`) || [];
      return [...found].sort((x, y) => x.place - y.place);
    },
  };
}
