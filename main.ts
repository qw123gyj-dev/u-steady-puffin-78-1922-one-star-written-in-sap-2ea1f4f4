// One Star, Written in Sap
// ==========================
//
// A tiny deterministic program for the make.fun bounty
// "u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4".
//
// The job: write ONE line, under 280 characters, in the voice of a
// houseplant leaving a one-star review of its human owner. The line
// must read like a real review, carry a genuine grievance, give a
// clear reason for the single star, and be funny.
//
// How this program works:
//
//   1. It holds a shortlist of hand-written candidate lines. Every
//      candidate is a single line, written in a plant's voice, each
//      built around one sharp, specific complaint: the watering, the
//      light, the pot, the repotting, the move, the neglect, the
//      glue, the poking, the harvesting.
//   2. A gate throws out any candidate that breaks the competition
//      rules: empty, only whitespace, more than one line, not valid
//      UTF-8, or 280 characters or more.
//   3. A scorer ranks the survivors. The criteria are weighed in the
//      order the brief gives them, most important first:
//        a. reads like a genuine one-star review (weight 5)
//        b. carries a real grievance at its centre (weight 4)
//        c. gives a clear reason for the single star (weight 3)
//        d. is funny (weight 2)
//        e. uses economical, precise wording (weight 1)
//   4. The winner is written to $MAKEFUN_OUTPUT_DIR/entry.txt
//      (falling back to /output/entry.txt), then read back and
//      compared byte for byte. If the read-back differs, the program
//      exits non-zero instead of pretending it succeeded.
//
// Determinism: no randomness, no clock, no network, no environment
// except the output directory. Node 22+ standard library only.
// The same input always produces the same entry.txt.
//
// Revision (round 2): three new candidates were added by hand (air
// plant, Venus flytrap, aloe), and the scorer was tightened: the
// "one" in "One star" no longer counts as evidence of a number, the
// grievance body score no longer hands out a free point, quoted
// owner speech is detected by shape instead of a fixed list, the
// "I am X, not Y" / "I asked for X" justification shapes are
// recognised structurally, and near-stock cliches in the plant's
// own voice now cost economy points. See the scorer comments.
//
// Usage:
//   MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// The gate counts characters, and the cap is "under 280", so a valid
// entry holds at most 279 characters. We count Unicode code points,
// which is how a human counts characters in a review.
const MAX_CHARS = 279;

// The output directory comes from the environment, exactly as the
// harness documents it. The fallback matches the sandbox default.
const OUTPUT_DIR =
  process.env.MAKEFUN_OUTPUT_DIR && process.env.MAKEFUN_OUTPUT_DIR.length > 0
    ? process.env.MAKEFUN_OUTPUT_DIR
    : "/output/entry.txt".slice(0, "/output".length);

const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

// A review that is funny at 150 characters beats a review that is
// funny at 270, so the economy scorer starts charging once a line
// passes this length. The charge is small: length for its own sake
// does not count, but flab does cost.
const ECONOMY_SOFT_CAP = 200;

// Stock phrases the brief explicitly bans. Any candidate containing
// one of these is scored down hard in the freshness check, and the
// gate keeps them out of the shortlist entirely by construction:
// none of the candidates below contains them.
const BANNED_PHRASES = [
  "drama queen",
  "dramatic wilting",
  "ignored",
];

// Near-stock cliches: not banned outright, but the opposite of
// fresh detail when they appear in the plant's own voice. The
// economy scorer charges for them, outside quoted owner speech
// only: the plant quoting a cliche back at its owner is evidence,
// not a cliche.
const NEAR_STOCK_PHRASES = [
  "plant mom",
  "plant dad",
  "plant parent",
  "green thumb",
  "low maintenance",
  "just add water",
  "thriving",
  "urban jungle",
];

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
//
// Fifteen hand-written one-liners. Each one is a different plant, a
// different complaint, and a different joke, so the scorer has a real
// choice to make instead of rubber-stamping a single draft.
//
// Rules every candidate follows:
//   - one line, no line breaks, no trailing whitespace
//   - under 280 characters (checked again by the gate at run time)
//   - starts with the review verdict, like a real one-star review
//   - the plant speaks in the first person about its own body:
//     water, light, soil, pot, roots, leaves
//   - the joke lands on a specific detail, never on a stock phrase

interface Candidate {
  // Which plant is speaking. Only used in diagnostics.
  plant: string;
  // The review itself. Must be a single line under 280 characters.
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    plant: "monstera",
    // The watering apology: he drowns the plant, then blames it for
    // still looking thirsty. Punchline reframes the plant as a
    // hostage, which is the review's sharpest turn.
    text: "One star. He waters me like he is apologizing to a plant he already killed, then acts shocked when I drink it all and still look thirsty. I have lived in this same pot since 2021. I am not decor. I am a hostage with leaves.",
  },
  {
    plant: "fiddle-leaf fig",
    // Six inches of "better light" costs four leaves. The plant
    // treats the leaf-drop as a published review of its own.
    text: "One star. She moved me six inches left for 'better light' and I dropped four leaves on the spot. She calls it attitude. I call it the only honest review this windowsill will ever get.",
  },
  {
    plant: "snake plant",
    // The "impossible to kill" brag, heard while unwatered for five
    // weeks. Survival reframed as a negotiation.
    text: "One star. He brags to guests that I am 'impossible to kill' while forgetting to water me for five weeks. Sir, surviving you is not a personality trait. It is a hostage negotiation.",
  },
  {
    plant: "fern",
    // One misting, one captioned photo, one radiator all winter. The
    // caption is the lie; the crispy fronds are the evidence.
    text: "One star. She mists me once, posts a photo captioned 'plant mom,' then parks me above a radiator all winter. My fronds are crispy. Her caption is a lie. Would not photosynthesize here again.",
  },
  {
    plant: "pothos",
    // Hung by the door as decoration, forgotten until the vines hit
    // the floor. The curtain line is the plant naming what it is not.
    text: "One star. He hung me by the front door in a macrame noose so guests could admire me, then forgot I exist until my vines touched the floor. I am not a curtain. I am a cry for help with roots.",
  },
  {
    plant: "cactus",
    // A cactus drowned by kindness. The plant asked for neglect and
    // got a swimming pool instead.
    text: "One star. He watered me every single day because 'plants love water,' then blamed me when I went soft in the middle. I am a cactus. I asked for neglect and a windowsill, not a swimming pool.",
  },
  {
    plant: "orchid",
    // Bought in bloom, left in a plastic cup, and told to wait. The
    // last two sentences hand the verdict back to the owner.
    text: "One star. She bought me in full bloom, watched every flower fall off, and told her friends I 'just need time.' Fourteen months now. My roots live in a plastic cup. Time is not the problem. She is.",
  },
  {
    plant: "basil",
    // Two years of flavouring dinners, repaid with a brick-wall view.
    // The herb keeps the receipt.
    text: "One star. He snips a leaf off me every time he makes pasta, calls it 'fresh,' then lets me bolt in a dark corner all winter. I flavored his dinners for two years and got a windowsill facing a brick wall.",
  },
  {
    plant: "succulent",
    // Repotted into a mug with no drainage hole, for the aesthetic.
    // The plant's only request is a hole in the bottom.
    text: "One star. She repotted me into a mug with no drainage hole, called it 'aesthetic,' and now my roots sit in a puddle. I did not ask to be cute. I asked for a hole in the bottom.",
  },
  {
    plant: "peace lily",
    // Watered only after collapsing flat. The owner mistakes a cry
    // for help for a personality.
    text: "One star. He only waters me after I collapse flat on the table, then tells guests I am 'so expressive.' I am not expressive. I am dying on a schedule and he thinks it is a personality.",
  },
  {
    plant: "spider plant",
    // Twelve children raised, twelve given away in yogurt cups, and
    // the mother still sits in the same cracked pot.
    text: "One star. She calls my babies 'free plants for friends' and hands them out in yogurt cups while I sit in the same cracked pot, unfertilized since 2023. I raised twelve children. I got nothing. Not even new soil.",
  },
  {
    plant: "money tree",
    // Named Lucky, parked by the door for fortune, starved of light.
    // The owner sweeps up the evidence and calls it bad energy.
    text: "One star. He named me Lucky, parked me by the door for good fortune, and never once checked whether I had light. My leaves fell off and he swept them up, saying I was 'shedding bad energy.' I was shedding because I am starving.",
  },
  {
    plant: "air plant",
    // Glued to driftwood and hung by the shower as living art, with
    // no soil and no pot at all. The neglect here is structural: the
    // plant was never given the things a plant needs, and the middle
    // sentence says the consequence out loud ("so I am drying out")
    // instead of leaving it implied. The ending lands twice, first
    // refusing the art label, then naming the one thing it actually
    // asked for.
    text: "One star. He glued me to driftwood, hung me in the shower, calls it 'living art,' then forgets my soak every week. No soil, no pot, no say — so I am drying out. I did not ask to be art. I asked for a pot.",
  },
  {
    plant: "venus flytrap",
    // Poked for fun until the traps die: each trap only snaps a few
    // times, so every snap costs the plant a mouth. The owner films
    // it and calls it playing with nature; the plant calls it what
    // it is, a carnivore treated as a toy.
    text: "One star. He pokes my traps every day to make them snap shut for fun and calls it 'playing with nature.' Each trap only snaps three times, then dies, so I am running out of mouths. I am a carnivore, not a fidget spinner.",
  },
  {
    plant: "aloe",
    // Harvested for burn gel and never watered for it. Six burns
    // healed is the receipt; "yet never once watered" is the
    // grievance. The punchline renames the plant as the thing the
    // owner treats it as: a pharmacy, not a plant.
    text: "One star. She squeezes the gel out of my leaves every time someone scorches toast and calls it 'the medicine cabinet.' Six burns healed, yet never once watered. I am an aloe, not a pharmacy.",
  },
];

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

// Count characters the way the gate does: Unicode code points, so an
// emoji or an accented letter counts once, not twice.
function charCount(text: string): number {
  return [...text].length;
}

// Split a line into lowercase words, keeping apostrophes inside
// words ("plant mom" stays two words, "don't" stays one). Punctuation
// around words is stripped so "pot." and "pot" match.
function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 0);
}

// Count how many of the given marker words appear in the text, each
// marker counted at most once, so repeating one word cannot farm
// points. Returns a number between 0 and markers.length.
function countMarkers(text: string, markers: string[]): number {
  const words = new Set(wordsOf(text));
  let hits = 0;
  for (const marker of markers) {
    if (words.has(marker)) {
      hits += 1;
    }
  }
  return hits;
}

// Count how many of the given phrases appear in the text (phrases
// may span several words). Case-insensitive, each phrase once.
function countPhrases(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const phrase of phrases) {
    if (lower.includes(phrase)) {
      hits += 1;
    }
  }
  return hits;
}

// True when the string is valid UTF-8 with no lone surrogates. A
// JavaScript string can hold unpaired surrogates, which are not
// valid UTF-8; the gate rejects those, so we check before writing.
function isValidUtf8(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate: the next unit must be a low surrogate.
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) {
        return false;
      }
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Low surrogate with no high surrogate before it.
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------
//
// Mirrors the competition gate exactly: 1 to 279 characters, not only
// whitespace, a single line, valid UTF-8. A candidate that fails any
// of these is removed before scoring, never ranked, never written.

interface GateResult {
  ok: boolean;
  reasons: string[];
}

function gate(candidate: Candidate): GateResult {
  const reasons: string[] = [];
  const text = candidate.text;

  if (text.length === 0) {
    reasons.push("empty");
  }
  if (text.trim().length === 0) {
    reasons.push("only whitespace");
  }
  if (charCount(text) > MAX_CHARS) {
    reasons.push(`too long: ${charCount(text)} characters`);
  }
  if (text.includes("\n") || text.includes("\r")) {
    reasons.push("more than one line");
  }
  if (text !== text.trim()) {
    reasons.push("leading or trailing whitespace");
  }
  if (!isValidUtf8(text)) {
    reasons.push("not valid UTF-8");
  }
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// The scorer
// ---------------------------------------------------------------------------
//
// Five sub-scores, each 0 to 10, combined with weights that fall in
// the brief's own order: a genuine review first, then the grievance,
// then the reason for the star, then the laugh, then the economy of
// the wording. Every sub-score is built from word and phrase lists
// that are visible in this file, so any ranking can be traced back
// to the exact words that earned it.
//
// Weights (brief order, strictly decreasing):
//   authenticity  5
//   grievance     4
//   star reason   3
//   humour        2
//   economy       1

const WEIGHTS = {
  authenticity: 5,
  grievance: 4,
  starReason: 3,
  humour: 2,
  economy: 1,
} as const;

interface Scores {
  authenticity: number;
  grievance: number;
  starReason: number;
  humour: number;
  economy: number;
  total: number;
}

// --- 1. Authenticity: does it read like a genuine one-star review? ---
//
// A real review opens with its verdict, speaks in the first person,
// names the thing being reviewed, and closes the way reviews close:
// with a recommendation, a refusal to return, or a flat judgement.
// A line that could only be a review scores high; a line that reads
// like a caption or a joke with a star taped on scores low.

const REVIEW_OPENINGS = ["one star", "1 star", "one-star", "★"];

const REVIEW_VOICE = [
  "i",
  "me",
  "my",
  "we",
  "our",
];

const REVIEW_CLOSINGS = [
  "would not",
  "never again",
  "do not recommend",
  "not recommend",
  "avoid",
  "stay away",
  "i am not",
  "i did not ask",
];

function scoreAuthenticity(candidate: Candidate): number {
  const text = candidate.text;
  let score = 0;

  // Opens with the verdict, as a real review does. Two points for
  // the opening alone: it is the first thing a reader sees.
  const lower = text.toLowerCase();
  if (lower.startsWith("one star") || lower.startsWith("1 star")) {
    score += 3;
  } else if (countPhrases(text, REVIEW_OPENINGS) > 0) {
    score += 1;
  }

  // First-person voice throughout: the plant is the reviewer, not a
  // narrator describing a plant.
  const firstPerson = countMarkers(text, REVIEW_VOICE);
  score += Math.min(2, firstPerson);

  // A review names its subject and its verdict in the same breath:
  // the owner ("he", "she") doing something to the plant.
  const ownerWords = countMarkers(text, ["he", "she"]);
  if (ownerWords > 0) {
    score += 1;
  }

  // Closes like a review: a refusal, a warning, or a flat judgement.
  const closings = countPhrases(text, REVIEW_CLOSINGS);
  score += Math.min(2, closings);

  // A line that names a concrete time span ("since 2021", "fourteen
  // months", "for two years") reads like a reviewer keeping a
  // record, not a caption writer reaching for a vibe.
  const timeSpans = countPhrases(text, [
    "since",
    "months",
    "years",
    "weeks",
    "all winter",
    "every time",
    "every day",
    "every week",
    "every single day",
  ]);
  score += Math.min(2, timeSpans);

  return Math.min(10, score);
}

// --- 2. Grievance: is the plant's own complaint at the centre? ---
//
// The brief's first criterion is the grievance. A strong entry is
// built on the plant's own body and needs: water, light, soil, pot,
// roots, leaves, repotting, being moved. A weak entry talks about
// the owner's feelings instead of the plant's.

const PLANT_BODY = [
  "water",
  "watered",
  "watering",
  "light",
  "soil",
  "pot",
  "roots",
  "leaves",
  "fronds",
  "vines",
  "flowers",
  "traps",
  "cup",
];

const NEGLECT_VERBS = [
  "forgot",
  "forgets",
  "forgotten",
  "forgetting",
  "blamed",
  "moved",
  "parked",
  "hung",
  "glued",
  "pokes",
  "squeezes",
  "repotted",
  "snips",
  "swept",
  "drowned",
  "starving",
  "dying",
  "crispy",
  "soft",
  "collapse",
];

const PLANT_ACTIONS = [
  "drink",
  "photosynthesize",
  "bolt",
  "flavored",
  "raised",
  "shedding",
  "dropped",
  "surviving",
  "snap",
  "healed",
];

function scoreGrievance(candidate: Candidate): number {
  const text = candidate.text;
  let score = 0;

  // The plant's body and needs, named concretely. Three distinct
  // body words is a near-full house; a line that names none of them
  // scores nothing here. (An earlier version added a free point on
  // top of the count, so even a line with no body words scored;
  // that is fixed: the count stands on its own.)
  const body = countMarkers(text, PLANT_BODY);
  score += Math.min(4, body);

  // Neglect verbs: what the owner did wrong, in plain words.
  const neglect = countMarkers(text, NEGLECT_VERBS);
  score += Math.min(3, neglect);

  // The plant doing plant things: drinking, dropping leaves, bolting.
  // This is what keeps the voice a plant's instead of a person in a
  // costume.
  const actions = countMarkers(text, PLANT_ACTIONS);
  score += Math.min(2, actions);

  // A grievance with a number in it ("five weeks", "four leaves",
  // "twelve children") is a complaint with evidence behind it.
  // "One" is deliberately left out of this list: every candidate
  // opens with "One star", so counting it would hand every line a
  // free point for its verdict instead of for its evidence.
  const hasNumber = /\b(two|three|four|five|six|twelve|fourteen|\d+)\b/.test(
    text.toLowerCase(),
  );
  if (hasNumber) {
    score += 1;
  }

  return Math.min(10, score);
}

// --- 3. Star reason: is the single star earned on the page? ---
//
// A one-star review has to say why it is one star, not five and not
// three. The reason must be causally linked to the complaint: the
// owner did X, so the plant suffered Y, so the star is one.

const CAUSAL_LINKS = [
  "because",
  "so",
  "then",
  "when",
  "while",
  "after",
  "until",
  "instead",
  "yet",
];

const STAR_JUSTIFICATIONS = [
  "not decor",
  "not a curtain",
  "not a personality",
  "not the problem",
  "not cute",
  "not expressive",
  "i did not ask",
  "i asked for",
  "hostage",
  "cry for help",
  "would not",
  "i got nothing",
  "i am starving",
];

function scoreStarReason(candidate: Candidate): number {
  const text = candidate.text;
  let score = 0;

  // The verdict is stated, not implied.
  if (text.toLowerCase().startsWith("one star")) {
    score += 2;
  }

  // Causal links tie the complaint to the verdict. A review with
  // three or more links reads as an argument, not a mood.
  // countMarkers only matches single words, so the two-word link
  // "in return" is counted as a phrase alongside them, once.
  const links =
    countMarkers(text, CAUSAL_LINKS) + countPhrases(text, ["in return"]);
  score += Math.min(3, links);

  // A justification phrase: the line that makes the single star
  // feel inevitable rather than petulant.
  const justifications = countPhrases(text, STAR_JUSTIFICATIONS);
  // Plus the shape, not just the wording: a closing correction of
  // the form "I am a carnivore, not a fidget spinner" states what
  // the plant is not, which is the review's reason in miniature --
  // the star is one because the owner treats the plant as the
  // wrong thing. Counted once, as one more justification hit.
  const correctionShape = /i am [^.!?]+, not /i.test(text) ? 1 : 0;
  score += Math.min(3, (justifications + correctionShape) * 2);

  // The complaint is specific enough to be a reason: a named object
  // (mug, radiator, brick wall, yogurt cups) the owner chose.
  const props = countPhrases(text, [
    "mug",
    "radiator",
    "brick wall",
    "yogurt cups",
    "plastic cup",
    "macrame",
    "driftwood",
    "front door",
    "windowsill",
    "swimming pool",
    "table",
  ]);
  score += Math.min(2, props);

  return Math.min(10, score);
}

// --- 4. Humour: does the line earn a real laugh? ---
//
// A laugh comes from a surprising turn, a sharp plant's-eye
// grievance, or a well-built joke -- not from a cute idea alone.
// The markers below look for the shapes jokes take: a contrast
// ("I am not X, I am Y"), the owner's own words quoted back at
// them, a reframing ("hostage", "negotiation", "personality"),
// and a punchline that lands in the last sentence.

const CONTRAST_TURNS = [
  "i am not",
  "i did not ask",
  "i asked for",
  "not a",
  "not the problem",
  "time is not",
];

// Quoted owner speech is detected by shape, not by a fixed list:
// any stretch in single quotes is the owner being quoted back at
// themselves. A fixed list could only ever reward the lines it was
// written from, and would score a new candidate's fresh quote at
// zero. The quote must start after whitespace or at the start of
// the line, so an apostrophe inside a word ("don't") is not one.
const QUOTED_OWNER_PATTERN = /(?:^|\s)'[^']+'/g;

const REFRAMES = [
  "hostage",
  "negotiation",
  "personality trait",
  "cry for help",
  "swimming pool",
  "fidget spinner",
  "pharmacy",
  "bad energy",
  "a lie",
  "on a schedule",
];

function scoreHumour(candidate: Candidate): number {
  const text = candidate.text;
  let score = 0;

  // A contrast turn ("I am not decor, I am a hostage") is the
  // classic joke shape of this brief: the plant corrects the
  // owner's idea of it.
  const contrasts = countPhrases(text, CONTRAST_TURNS);
  score += Math.min(3, contrasts * 2);

  // Quoting the owner's words back at them, in their own voice,
  // lets the joke land on the owner instead of on the plant.
  const quotes = (text.match(QUOTED_OWNER_PATTERN) ?? []).length;
  score += Math.min(2, quotes * 2);

  // A reframing word: the plant renames its situation as something
  // absurdly human (a hostage, a negotiation, a schedule).
  const reframes = countPhrases(text, REFRAMES);
  score += Math.min(3, reframes);

  // A punchline in the last sentence: the final clause carries a
  // twist word ("hostage", "starving", "personality", "lie") rather
  // than trailing off.
  const sentences = text.split(/(?<=[.!?])\s+/);
  const last = sentences[sentences.length - 1] ?? "";
  const punchWords = countMarkers(last, [
    "hostage",
    "starving",
    "personality",
    "lie",
    "bottom",
    "soil",
    "roots",
    "pharmacy",
    "negotiation",
  ]);
  score += Math.min(2, punchWords);

  return Math.min(10, score);
}

// --- 5. Economy: fresh, specific, precise wording. ---
//
// Short is not the goal -- length for its own sake does not count --
// but flab is a cost. A tight line earns its points; a padded one
// pays for every word past the soft cap. And a banned stock phrase
// ("drama queen", "dramatic wilting", "ignored") costs heavily: the
// brief names them as the opposite of fresh detail. Near-stock
// cliches ("plant mom", "green thumb", "low maintenance") cost
// less, but they cost: freshness is judged in the plant's own
// voice, not in words it quotes back at its owner.

const FILLER_WORDS = [
  "really",
  "very",
  "just",
  "actually",
  "literally",
  "basically",
  "totally",
  "honestly",
];

function scoreEconomy(candidate: Candidate): number {
  const text = candidate.text;
  const length = charCount(text);
  let score = 8;

  // Past the soft cap, each extra ten characters costs a point.
  // A 279-character line can still score 8 minus 7, never zero.
  if (length > ECONOMY_SOFT_CAP) {
    score -= Math.floor((length - ECONOMY_SOFT_CAP) / 10);
  }

  // Filler words are padding. Each distinct filler costs a point.
  // Quoted owner speech is exempt, as in the repeat check below:
  // "just" inside the owner's quoted 'just need time.' is the
  // owner's word, not the plant's padding.
  const unquoted = text.replace(/'[^']*'/g, "");
  const filler = countMarkers(unquoted, FILLER_WORDS);
  score -= filler;

  // A banned stock phrase is the opposite of fresh detail.
  const banned = countPhrases(text, BANNED_PHRASES);
  score -= banned * 5;

  // A near-stock cliche in the plant's own voice costs two points
  // each. Quoted owner speech is exempt here too: the plant
  // quoting a cliche back at its owner is evidence, not a cliche.
  const nearStock = countPhrases(unquoted, NEAR_STOCK_PHRASES);
  score -= nearStock * 2;

  // A repeated word used twice in one line is usually a crutch.
  // Count repeats outside quotation marks, reusing the unquoted
  // text above.
  const seen = new Map<string, number>();
  for (const word of wordsOf(unquoted)) {
    if (word.length > 3) {
      seen.set(word, (seen.get(word) ?? 0) + 1);
    }
  }
  let repeats = 0;
  for (const count of seen.values()) {
    if (count > 1) {
      repeats += 1;
    }
  }
  score -= Math.min(2, repeats);

  return Math.max(0, Math.min(10, score));
}

// Combine the five sub-scores with the brief's weights. The total
// runs 0 to 150 (5+4+3+2+1 weights times a 0-10 sub-score).
function scoreCandidate(candidate: Candidate): Scores {
  const authenticity = scoreAuthenticity(candidate);
  const grievance = scoreGrievance(candidate);
  const starReason = scoreStarReason(candidate);
  const humour = scoreHumour(candidate);
  const economy = scoreEconomy(candidate);
  const total =
    authenticity * WEIGHTS.authenticity +
    grievance * WEIGHTS.grievance +
    starReason * WEIGHTS.starReason +
    humour * WEIGHTS.humour +
    economy * WEIGHTS.economy;
  return { authenticity, grievance, starReason, humour, economy, total };
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------
//
// Highest total wins. Ties break toward the shorter line (fewer
// characters, fewer bytes), then toward the earlier candidate, so
// the result is fully deterministic and stable across runs.

interface Ranked {
  candidate: Candidate;
  scores: Scores;
  index: number;
}

function rank(candidates: Candidate[]): Ranked[] {
  const ranked: Ranked[] = [];
  candidates.forEach((candidate, index) => {
    const result = gate(candidate);
    if (!result.ok) {
      console.error(
        `gate: dropping #${index} (${candidate.plant}): ${result.reasons.join("; ")}`,
      );
      return;
    }
    ranked.push({ candidate, scores: scoreCandidate(candidate), index });
  });
  ranked.sort((a, b) => {
    if (b.scores.total !== a.scores.total) {
      return b.scores.total - a.scores.total;
    }
    const aChars = charCount(a.candidate.text);
    const bChars = charCount(b.candidate.text);
    if (aChars !== bChars) {
      return aChars - bChars;
    }
    return a.index - b.index;
  });
  return ranked;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
//
// Write the winner to $MAKEFUN_OUTPUT_DIR/entry.txt, then read the
// file back and compare it byte for byte with what was meant to be
// written. A mismatch means the write did not land, so the program
// fails loudly instead of shipping a wrong entry.

function writeWinner(winner: Ranked): void {
  const text = winner.candidate.text;
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, text, "utf8");

  const readBack = readFileSync(OUTPUT_FILE, "utf8");
  if (readBack !== text) {
    throw new Error(
      `read-back mismatch: wrote ${charCount(text)} characters, ` +
        `read back ${charCount(readBack)} characters`,
    );
  }

  // The gate runs one last time on the file itself, not just on the
  // in-memory candidate, so a filesystem surprise cannot slip past.
  const fileGate = gate({ plant: winner.candidate.plant, text: readBack });
  if (!fileGate.ok) {
    throw new Error(`written file failed the gate: ${fileGate.reasons.join("; ")}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const ranked = rank(CANDIDATES);
  if (ranked.length === 0) {
    console.error("no candidate passed the gate");
    process.exit(1);
  }

  // Diagnostics on stderr: the full table, so a human can see why
  // the winner won. The entry itself is only ever written to the
  // output file, never printed to stdout.
  for (const entry of ranked) {
    const s = entry.scores;
    console.error(
      `#${entry.index} ${entry.candidate.plant} ` +
        `total=${s.total} ` +
        `auth=${s.authenticity} griev=${s.grievance} ` +
        `reason=${s.starReason} humour=${s.humour} econ=${s.economy} ` +
        `chars=${charCount(entry.candidate.text)}`,
    );
  }

  const winner = ranked[0];
  if (winner === undefined) {
    console.error("no winner: ranking was empty");
    process.exit(1);
  }

  writeWinner(winner);

  console.error(
    `winner: #${winner.index} (${winner.candidate.plant}), ` +
      `${charCount(winner.candidate.text)} characters, ` +
      `total score ${winner.scores.total}/150`,
  );
  console.error(`wrote ${OUTPUT_FILE}`);
}

main();
