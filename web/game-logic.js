import {missionHazard} from './mission-director.js';
export const meta = { game: 'SQUAD — De Klunzenstad', minPlayers: 1, maxPlayers: 30 };
const MAX_PLAYERS = 30;
const TEAM_SIZE = 5;
const TEAM_COUNT = 6;
const CARGO = ['bank', 'pudding', 'wasmachine'];
const newSeason = () => ({ round: 1, week: 1, cityLevel: 1, deliveries: 0, crashes: 0, history: [] });
const activeTeams = s => [...new Set(s.roster.map(id => s.players[id]?.team).filter(i => Number.isInteger(i)))];
const everybodyDelivered = s => activeTeams(s).length > 0 && activeTeams(s).every(i => s.teams[i]?.finished);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function initialPlayer(index) {
  return { team: Math.min(TEAM_COUNT - 1, Math.floor(index / TEAM_SIZE)), x: (index % TEAM_SIZE - 2) * 1.65,
    z: -5 - (index % 2), grip: false, rescues: 0, stumble: 0, dir: [0, 0], lastMove: -100 };
}
function initialTeam(id, round = 1) {
  return { id, round, cargo: CARGO[(id + round - 1) % CARGO.length], couch: { x: 0, z: 1, wobble: 0 }, gate: false, fanOff: false,
    crashes: 0, finished: false, stabilization: 0, event: '', eventSeq: 0 };
}
export function setup(players) {
  const roster = players.slice(0, MAX_PLAYERS);
  return { roster, players: Object.fromEntries(roster.map((id, index) => [id, initialPlayer(index)])),
    teams: Array.from({ length: TEAM_COUNT }, (_, index) => initialTeam(index)), moves: 0, festival: 0, season: newSeason() };
}
export function validateAction(state, id, action) {
  if (!action || typeof action !== 'object' || !['move', 'grab', 'switch', 'join', 'help', 'advance'].includes(action.type)) return { ok: false, error: 'Onbekende actie' };
  if (action.type === 'join') return { ok: false, error: 'Alleen de spelserver kan spelers toevoegen' };
  if (!state?.players?.[id]) return { ok: false, error: 'Speler niet actief. Herlaad de pagina.' };
  if (action.type === 'advance' && !everybodyDelivered(state)) return { ok: false, error: 'Eerst moeten alle actieve ploegen hun vracht afleveren.' };
  if (action.type === 'move' && (!Number.isFinite(action.dx) || !Number.isFinite(action.dz) ||
    Math.abs(action.dx) > 1 || Math.abs(action.dz) > 1)) return { ok: false, error: 'Ongeldige beweging' };
  return { ok: true };
}
function announce(team, message) { team.event = message; team.eventSeq += 1; }

export function applyAction(state, id, action) {
  if (action.type === 'join') {
    if (state.players[id] || state.roster.length >= MAX_PLAYERS) return state;
    return { ...state, roster: [...state.roster, id],
      players: { ...state.players, [id]: initialPlayer(state.roster.length) } };
  }
  const original = state.players[id];
  if (!original) return state;
  if (action.type === 'advance') {
    if (!everybodyDelivered(state)) return state;
    const previous = state.season || newSeason();
    const delivered = activeTeams(state).length;
    const round = previous.round + 1;
    const season = { ...previous, round, week: Math.min(40, Math.ceil(round / 5)),
      cityLevel: Math.min(10, 1 + Math.floor((round - 1) / 3)),
      deliveries: previous.deliveries + delivered,
      crashes: previous.crashes + state.teams.reduce((sum, t) => sum + t.crashes, 0),
      history: [...previous.history.slice(-9), { round: previous.round, delivered }]
    };
    const players = Object.fromEntries(state.roster.map((pId, i) => [pId, {
      ...state.players[pId], ...initialPlayer(i), rescues: state.players[pId]?.rescues || 0
    }]));
    return { ...state, season, players,
      teams: Array.from({ length: TEAM_COUNT }, (_, i) => initialTeam(i, round)),
      moves: state.moves + 1, festival: 0 };
  }
  const p = { ...original };
  const players = { ...state.players };
  const teams = state.teams.slice();
  const team = { ...teams[p.team], couch: { ...teams[p.team].couch } };
  const couch = team.couch;
  const nearCouch = () => distance(p, couch) < 5.1;

  if (action.type === 'grab' && !team.finished) {
    if (p.grip) { p.grip = false; announce(team, 'PLOF! Je hebt losgelaten.'); }
    else if (nearCouch()) { p.grip = true; announce(team, 'VAST! Wacht op een tweede kluns.'); }
    else announce(team, 'Te ver weg! Ren naar de enorme bank.');
  }
  if (action.type === 'help' && !team.finished) {
    if (distance(p, couch) < 7) {
      p.grip = false;
      p.rescues += 1;
      team.stabilization = clamp(team.stabilization + 3, 0, 12);
      couch.wobble = clamp(couch.wobble - 0.65, 0, 6);
      announce(team, 'BOING! Je houdt de bank weer in balans.');
    } else announce(team, 'Loop dichter naar de bank om te helpen.');
  }
  if (action.type === 'switch' && !team.finished) {
    if (!team.fanOff && Math.hypot(p.x + 5.4, p.z - 12) < 4.3) {
      team.fanOff = true;
      announce(team, 'WHOESJ! De mega-ventilator is uitgeschakeld.');
    } else if (!team.gate && Math.hypot(p.x - 6, p.z - 19) < 4.5) {
      team.gate = true;
      announce(team, 'KLANG! De wiebelbrug gaat open.');
    }
  }
  if (action.type === 'move' && !team.finished) {
    const m = Math.max(1, Math.hypot(action.dx, action.dz));
    const dx = action.dx / m;
    const dz = action.dz / m;
    const stumbleFactor = p.stumble > 0 ? .52 : 1;
    p.stumble = Math.max(0, (p.stumble || 0) - 1);
    p.x = clamp(p.x + dx * .65 * stumbleFactor, -8, 8);
    p.z = clamp(p.z + dz * .75 * stumbleFactor, -10, 40);
    p.dir = [dx, dz];
    p.lastMove = state.moves;
    if (!nearCouch()) p.grip = false;
    // Pulling together succeeds; contradictory recent steering makes the sofa wobble.
    const carriers = Object.entries(players)
      .filter(([otherId, other]) => (otherId === id ? p : other).team === p.team &&
        (otherId === id ? p : other).grip && distance(otherId === id ? p : other, couch) < 5.3)
      .map(([otherId, other]) => ({ ...otherId === id ? p : other, id: otherId }));
    // In the single-player practice room, a clearly labelled computer teammate helps.
    // The helper disappears as soon as a second real player joins the room.
    const practiceHelper = state.roster.length === 1 && p.team === 0 && p.grip;
    if (p.grip && (carriers.length >= 2 || practiceHelper)) {
      const relevant = carriers.filter(other => state.moves - other.lastMove < 10);
      const disagreement = relevant.some(other => other.id !== id &&
        dx * other.dir[0] + dz * other.dir[1] < -.25);
      if (disagreement) {
        couch.wobble += team.cargo === 'pudding' ? .53 : .36;
      } else {
        const teamwork = relevant.length >= 2 || practiceHelper ? 1 : .58;
        const stabilization = team.stabilization > 0 ? .55 : 1;
        const cargoSpeed = team.cargo === 'pudding' ? .62 : team.cargo === 'wasmachine' ? .43 : .5;
        const hazard = missionHazard(team.round || state.season?.round || 1, team.id, couch.z);
        const nextZ = clamp(couch.z + dz * cargoSpeed * teamwork * hazard.stickySpeed, 1, team.gate ? 35 : 17.7);
        const nextX = clamp(couch.x + dx * .26 * teamwork, -5, 5);
        couch.wobble += Math.abs(dx) * ((team.cargo === 'pudding' ? .12 : .05) + hazard.bounceWobble) * stabilization;
        if (nextZ === couch.z && dz > 0 && !team.gate) couch.wobble += .06;
        couch.z = nextZ;
        couch.x = nextX;
        couch.wobble = Math.max(0, couch.wobble - .012 * carriers.length);
        team.stabilization = Math.max(0, team.stabilization - .06);
      }
      if (!team.fanOff && couch.z >= 10 && couch.z < 17.5) couch.wobble += team.cargo === 'pudding' ? .29 : .23;
      couch.wobble += missionHazard(team.round || state.season?.round || 1, team.id, couch.z).windWobble;
    }
    if (couch.wobble >= 1.65) {
      couch.z = Math.max(1, couch.z - 2.3);
      couch.x = clamp(couch.x + (dx >= 0 ? -.6 : .6), -5, 5);
      couch.wobble = .25;
      team.crashes += 1;
      team.stabilization = 0;
      announce(team, ['KLABAM! De vracht maakte een salto!', 'O NEE! Alles schuift ineens!', 'BOEM! Daar gaat het gevaarte weer!'][team.crashes % 3]);
      for (const [otherId, other] of Object.entries(players)) {
        if (other.team !== p.team || distance(other, couch) >= 8) continue;
        players[otherId] = { ...other, grip: false, stumble: 5 };
      }
      p.grip = false;
      p.stumble = 5;
    }
    if (couch.z >= 34 && team.gate) {
      team.finished = true;
      couch.wobble = 0;
      p.grip = false;
      announce(team, 'GEWONNEN! De vracht is aangekomen. Iedereen leeft nog!');
    }
  }
  players[id] = p;
  teams[p.team] = team;
  return { ...state, players, teams, moves: state.moves + 1, festival: teams.filter(t => t.finished).length };
}
export function isGameOver() { return { over: false }; }
export function viewFor(state, id) {
  const p = state.players[id] || null;
  return { you: id, player: p, players: state.players, teams: state.teams, team: p?.team ?? 0,
    roster: state.roster, festival: state.festival, moves: state.moves, practice: state.roster.length === 1,
    season: state.season || newSeason(), canAdvance: everybodyDelivered(state) };
}
