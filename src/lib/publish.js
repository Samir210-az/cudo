import { buildSchedule, matchNumbers, roundName } from './tournament';
import { fetchSchedule, publishSchedule } from './links';

const UNKNOWN = 'rəqib hələ bəlli deyil';

function gamesOf(athleteId, brackets, schedule) {
  const games = [];
  let category = null;
  let bye = false;
  for (const b of brackets) {
    const mine = b.athletes.some((a) => a.id === athleteId);
    if (!mine) continue;
    category = b.label;
    const nums = matchNumbers(b);
    const person = (id) => b.athletes.find((a) => a.id === id);
    for (const m of b.matches) {
      if (m.a !== athleteId && m.b !== athleteId) continue;
      if (m.bye) {
        bye = true;
        continue;
      }
      const other = person(m.a === athleteId ? m.b : m.a);
      const slot = schedule.slots.get(`${b.category_key}:${m.id}`);
      games.push({
        number: nums.get(m.id),
        mat: slot?.mat ?? null,
        time: slot?.time ?? null,
        order: slot?.order ?? 0,
        round: roundName(b, m),
        opponent: other ? other.name : UNKNOWN,
        opponent_club: other?.club || null,
        result: m.winner ? (m.winner === athleteId ? 'qalib' : 'məğlub') : null,
      });
    }
  }
  games.sort((x, y) => x.order - y.order);
  return { category, bye, games: games.map(({ order, ...rest }) => rest) };
}

const stable = (value) => JSON.stringify(value, (_, v) => (
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)))
    : v
));

export async function publishSchedules(competition, links, athletes, brackets, config, { onlyChanged = false } = {}) {
  const schedule = buildSchedule(brackets, config);
  const now = new Date().toISOString();
  let written = 0;
  for (const link of links) {
    const mine = athletes.filter((a) => a.link_ref?.startsWith(`${link.id}_`));
    const rows = mine
      .map((a) => ({ name: [a.last_name, a.first_name].filter(Boolean).join(' '), ...gamesOf(a.id, brackets, schedule) }))
      .sort((x, y) => x.name.localeCompare(y.name, 'az'));
    const payload = {
      competition_name: competition.name,
      club_name: link.club_name,
      date: competition.held_on || null,
      drawn: brackets.length > 0,
      rows,
    };
    if (onlyChanged) {
      const current = await fetchSchedule(link.id);
      if (!current) continue;
      const { updated_at: _, ...rest } = current;
      if (stable(rest) === stable(payload)) continue;
    }
    await publishSchedule(link.id, { ...payload, updated_at: now });
    written += 1;
  }
  return written;
}
