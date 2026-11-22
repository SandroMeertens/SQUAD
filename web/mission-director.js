/**
 * SQUAD missieregisseur.
 * Alleen bestaande velden (ronde, team, vracht en positie) bepalen de variant.
 * Daardoor zijn geen extra Firebase-databasevelden of betaalde functies nodig.
 */
export const CARGO_STORIES = {
  bank: {
    title: 'BANK OP DE VLUCHT',
    description: 'Een bank met grootheidswaanzin. Draag hem samen naar de overkant!',
    short: 'DE ENORME BANK'
  },
  pudding: {
    title: 'PUDDING-PANIEK',
    description: 'De grootste drilpudding ooit wiebelt gevaarlijk dicht bij de rand!',
    short: 'DE GLIBBERPUDDING'
  },
  wasmachine: {
    title: 'WASMACHINE-WAANZIN',
    description: 'Een wasmachine op centrifugestand. Dit wordt een hobbelige rit!',
    short: 'DE WOESTE WASMACHINE'
  }
};
export const TWISTS = [
  { key: 'normal', name: 'DE GROTE VERHUIZING',
    hint: 'Samen tillen, ventilator stoppen, brug openen.' },
  { key: 'wind', name: 'STORM OP DE BRUG',
    hint: 'Tussen de torens duwt de wind tegen jullie vracht. Gebruik HELP!' },
  { key: 'sticky', name: 'KLEEFKLEEF-KOERS',
    hint: 'Het wegdek plakt! Samen duwen maakt het weer mogelijk.' },
  { key: 'bouncy', name: 'SPRINGVEER-CHAOS',
    hint: 'De brug trilt: rechtdoor is makkelijker dan zigzaggen.' }
];
const limitRound = round => Number.isFinite(round) ? Math.max(1,Math.floor(round)) : 1;
export function missionFor(round = 1, teamId = 0, cargo = 'bank') {
  const r = limitRound(round);
  const t = Number.isInteger(teamId) ? Math.max(0,Math.min(5,teamId)) : 0;
  const story = CARGO_STORIES[cargo] || CARGO_STORIES.bank;
  const twist = TWISTS[(r - 1 + t) % TWISTS.length];
  return {
    title: story.title, subtitle: story.description,
    cargoName: story.short, twist: twist.key,
    twistTitle: twist.name, twistHint: twist.hint,
    round: r, week: Math.min(40,Math.ceil(r / 5))
  };
}
/** How the current obstacle changes the co-op physics between checkpoints. */
export function missionHazard(round, teamId, positionZ) {
  const {twist} = missionFor(round,teamId);
  const inZone = positionZ >= 5 && positionZ <= 23;
  return {
    key: twist,
    windWobble: inZone && twist === 'wind' ? .055 : 0,
    stickySpeed: inZone && twist === 'sticky' ? .64 : 1,
    bounceWobble: inZone && twist === 'bouncy' ? .11 : 0
  };
}
