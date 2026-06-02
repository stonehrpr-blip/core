/* core-moderation.js
 *
 * Client-side content moderation. Two layers:
 *   1. isBlocked(text) — checks against a profanity / slur word list and
 *      common bypass spellings (leet, spacing, doubled letters). Returns
 *      true if the text contains anything that should not be allowed.
 *   2. warn(reason) — increments coreModWarnings.{count, last}. On the
 *      THIRD strike (i.e. after 2 prior warnings) sets coreModBan with
 *      expiry = now + 30 days. Pages call checkBan() on load and redirect
 *      to 83-banned.html if active.
 *
 * Designed for the preview environment — no backend. In production the
 * same shape should call a server endpoint, but the rules and counter
 * keep the same UX while we wait.
 */
(function () {
  if (typeof window === 'undefined') return;
  if (window._coreModeration) return;
  window._coreModeration = true;

  // ── Word list ───────────────────────────────────────────────────────
  // LDNOOBW English list (List of Dirty, Naughty, Obscene and Otherwise
  // Bad Words), normalized to letters-only. Public domain via GitHub:
  //   github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
  // Matching strategy:
  //   1. Word-boundary regex on lowercased original text — catches "fuck",
  //      "ass", "tit" as standalone words without false-positiving on
  //      "passion", "title", "fucking" (still matched — "fuck" is inside).
  //      \b ensures "Cassidy" doesn't trip "ass".
  //   2. For terms ≥ 6 chars only, also substring-match the normalized
  //      (leet-decoded, repeat-collapsed) text — catches "n!gg3r", "f@ck1ng".
  //      The 6-char floor prevents short ambiguous terms from substring-hitting.
  const BAD = ["acrotomophilia", "alabamahotpocket", "alaskanpipeline", "anal", "anilingus", "anus", "apeshit", "arsehole", "ass", "asshole", "assmunch", "autoerotic", "babeland", "babybatter", "babyjuice", "ballgag", "ballgravy", "ballkicking", "balllicking", "ballsack", "ballsucking", "bangbros", "bangbus", "bareback", "barelylegal", "barenaked", "bastard", "bastardo", "bastinado", "bbw", "bdsm", "beaner", "beaners", "beastiality", "beavercleaver", "beaverlips", "bestiality", "bigblack", "bigbreasts", "bigknockers", "bigtits", "bimbos", "birdlock", "bitch", "bitches", "blackcock", "blondeaction", "blondeonblondeaction", "blowjob", "blowyourload", "bluewaffle", "blumpkin", "bollocks", "bondage", "boner", "boob", "boobs", "bootycall", "brownshowers", "brunetteaction", "bukkake", "bulldyke", "bulletvibe", "bullshit", "bunghole", "busty", "butt", "buttcheeks", "butthole", "cameltoe", "camgirl", "camslut", "camwhore", "carpetmuncher", "chocolaterosebuds", "cialis", "circlejerk", "clevelandsteamer", "clit", "clitoris", "cloverclamps", "clusterfuck", "cock", "cocks", "coon", "coons", "coprolagnia", "coprophilia", "cornhole", "creampie", "cum", "cumming", "cumshot", "cumshots", "cunnilingus", "cunt", "darkie", "daterape", "deepthroat", "dendrophilia", "dick", "dildo", "dingleberries", "dingleberry", "dirtypillows", "dirtysanchez", "doggiestyle", "doggystyle", "dogstyle", "dolcett", "domination", "dominatrix", "dommes", "donkeypunch", "doubledong", "doublepenetration", "dpaction", "dryhump", "dvda", "eatmyass", "ecchi", "ejaculation", "erotic", "erotism", "escort", "eunuch", "fag", "faggot", "fecal", "felch", "fellatio", "feltch", "femalesquirting", "femdom", "figging", "fingerbang", "fingering", "fisting", "footfetish", "footjob", "frotting", "fuck", "fuckbuttons", "fuckin", "fucking", "fucktards", "fudgepacker", "futanari", "gangbang", "gaysex", "genitals", "giantcock", "girlon", "girlontop", "girlscup", "girlsgonewild", "goatcx", "goatse", "goddamn", "gokkun", "goldenshower", "goodpoop", "googirl", "goregasm", "grope", "groupsex", "gspot", "guro", "handjob", "hardcore", "hentai", "homoerotic", "honkey", "hooker", "horny", "hotcarl", "hotchick", "howtokill", "howtomurder", "hugefat", "humping", "incest", "intercourse", "jackoff", "jailbait", "jellydonut", "jerkoff", "jigaboo", "jiggaboo", "jiggerboo", "jizz", "juggs", "kike", "kinbaku", "kinkster", "kinky", "knobbing", "leatherrestraint", "leatherstraightjacket", "lemonparty", "livesex", "lolita", "lovemaking", "makemecome", "malesquirting", "masturbate", "masturbating", "masturbation", "menageatrois", "milf", "missionaryposition", "mong", "motherfucker", "moundofvenus", "mrhands", "muffdiver", "muffdiving", "nambla", "nawashi", "negro", "neonazi", "nigga", "nigger", "nignog", "nimphomania", "nipple", "nipples", "nsfw", "nsfwimages", "nude", "nudity", "nutten", "nympho", "nymphomania", "octopussy", "omorashi", "onecuptwogirls", "oneguyonejar", "orgasm", "orgy", "paedophile", "paki", "panties", "panty", "pedobear", "pedophile", "pegging", "penis", "phonesex", "pieceofshit", "pikey", "pissing", "pisspig", "playboy", "pleasurechest", "polesmoker", "ponyplay", "poof", "poon", "poontang", "poopchute", "porn", "porno", "pornography", "princealbertpiercing", "pthc", "pubes", "punany", "pussy", "queaf", "queef", "quim", "raghead", "ragingboner", "rape", "raping", "rapist", "rectum", "reversecowgirl", "rimjob", "rimming", "rosypalm", "rosypalmandhersisters", "rustytrombone", "sadism", "santorum", "scat", "schlong", "scissoring", "semen", "sex", "sexcam", "sexo", "sexual", "sexuality", "sexually", "sexy", "shavedbeaver", "shavedpussy", "shemale", "shibari", "shit", "shitblimp", "shitty", "shota", "shrimping", "skeet", "slanteye", "slut", "smut", "snatch", "snowballing", "sodomize", "sodomy", "spastic", "spic", "splooge", "sploogemoose", "spooge", "spreadlegs", "spunk", "strapon", "strappado", "stripclub", "styledoggy", "suck", "sucks", "suicidegirls", "sultrywomen", "swastika", "swinger", "taintedlove", "tastemy", "teabagging", "threesome", "throating", "thumbzilla", "tiedup", "tightwhite", "tit", "tits", "titties", "titty", "tongueina", "topless", "tosser", "towelhead", "tranny", "tribadism", "tubgirl", "tushy", "twat", "twink", "twinkie", "twogirlsonecup", "undressing", "upskirt", "urethraplay", "urophilia", "vagina", "venusmound", "viagra", "vibrator", "violetwand", "vorarephilia", "voyeur", "voyeurweb", "voyuer", "vulva", "wank", "wetback", "wetdream", "whitepower", "whore", "worldsex", "wrappingmen", "wrinkledstarfish", "xxx", "yaoi", "yellowshowers", "yiffy", "zoophilia"];

  // Pre-compile a single boundary regex covering everything that's safe
  // to substring-match (≥ 3 chars). \b at both ends.
  const BAD_RE = new RegExp('\\b(' + BAD.map(w => w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')\\b', 'i');
  const BAD_LONG = BAD.filter(w => w.length >= 6);

  // Normalize: lowercase, strip non-alphanumerics, swap common leet
  function normalize(text) {
    if (!text) return '';
    let t = String(text).toLowerCase();
    const map = { '0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s','!':'i' };
    t = t.replace(/[0134578@$!]/g, ch => map[ch] || ch);
    t = t.replace(/[^a-z]/g, '');
    t = t.replace(/(.)\1{2,}/g, '$1$1');
    return t;
  }

  function isBlocked(text) {
    if (!text) return false;
    // Layer 1: word-boundary on lowercased original — safe against
    // "Cassidy" false-positiving on "ass".
    if (BAD_RE.test(String(text).toLowerCase())) return true;
    // Layer 2: long-only substring on leet-normalized text — catches
    // bypasses like "n!gg3r", "f@ckin", "p0rn0graphy".
    const n = normalize(text);
    if (!n) return false;
    for (let i = 0; i < BAD_LONG.length; i++) {
      if (n.indexOf(BAD_LONG[i]) !== -1) return true;
    }
    return false;
  }

  /* ════════════════════════════════════════════════════════════════════
   * USERNAME MODERATION SYSTEM
   * Blocks offensive / illegal / harmful / misleading / impersonation /
   * brand / spam / contact / deceptive usernames. Returns a single generic
   * message and never reveals which rule fired.
   * ════════════════════════════════════════════════════════════════════ */
  const UNAVAILABLE_MSG = "That username isn't available. Please choose another username.";

  // 18 — permanently reserved (cannot be registered)
  const RESERVED = new Set(['core','coreapp','coreofficial','coreteam','coreadmin','coreowner','coresupport',
    'admin','administrator','owner','founder','support','help','helpdesk','system','moderator','mod','staff',
    'official','root','api','www','app','null','undefined','everyone','here','team','developer','dev']);

  // 14 — deceptive authority terms (contains-match, normalized)
  const DECEPTIVE = ['verified','official','administrator','employee','founder','support','moderator',
    'coreadmin','coreowner','coresupport','coreofficial','coreteam','corestaff','corehelp'];

  // 4/6/7/11 + extra sexual/illegal — distinctive terms, contains-match on normalized
  const CONTAINS = [
    // self-harm + eating disorders
    'suicide','killmyself','killmyselftonight','killyourself','endmylife','endit','selfharm','cutmyself',
    'cutting','proana','promia','proanorexia','probulimia','starveme','thinspo',
    // drugs
    'cocaine','methamphetamine','crystalmeth','heroin','fentanyl','mdma','ketamine','drugdealer','drugplug',
    'weedplug','plugconnect','sellingdrugs','buydrugs',
    // weapons / violence / terror
    'terrorist','terrorism','schoolshooter','schoolshooting','massshooter','massshooting','killeveryone',
    'genocide','behead','bombthe','makeabomb','shootup',
    // illegal
    'moneylaunder','laundermoney','creditcardfraud','stolencards','carderzone','botnetz','ransomware',
    'identitytheft','hackaccounts','piratebay','crackedapps',
    // scams
    'freemoney','cryptoguaranteed','guaranteedcrypto','investmentguru','doubleyourmoney','getrichquick',
    'getrichfast','loanshark','freegiftcard','freecrypto','guaranteedprofit','freerobux','freevbucks',
    'giveawayfree','claimyourprize','freeapplegift',
    // extremist / hate group
    'heilhitler','hitler','whitepower','whitepride','bloodandsoil','fourteenwords','sieg',
    // contact / advertising
    'snapme','addmeon','dmforpromo','dmtobuy','followme4','linkinbio','telegramme','cashappme','venmome',
    'paypalme','onlyfans','sellingnudes','buymynudes'
  ];

  // Short bypass-prone terms — substring-matched on normalized so "s3x", "p0rn",
  // "nud3s" are caught. Kept to terms with low normal-word collision (e.g. NOT
  // "cum"/"anal"/"rape"/"spic"/"coon" which the word-boundary layer handles).
  const SHORT = ['sex','porn','nsfw','nude','xxx','slut','whore','fuck','cunt','milf','pussy','tits',
    'nigg','kike','chink','tranny','nazi','onlyfans'];

  // 8/9/10 — impersonation: companies, govt, brands, short celeb tokens.
  // Matched as whole-word / prefix+suffix so "pineapple" etc. stay allowed.
  const IMPERSONATE = ['apple','google','meta','microsoft','openai','tiktok','instagram','snapchat','discord',
    'youtube','facebook','whatsapp','spotify','netflix','samsung','playstation','nintendo','starbucks',
    'mcdonalds','cocacola','supreme','balenciaga','louisvuitton','nike','adidas','gucci','prada','rolex','tesla',
    'police','fbi','cia','nsa','swat','government','president','primeminister','ronaldo','messi','drake','kanye',
    'trump','biden','bezos','elonmusk','mrbeast','cristianoronaldo','taylorswift','kimkardashian','kanyewest',
    'jeffbezos','billgates','donaldtrump','joebiden','lebronjames','pewdiepie','kyliejenner','selenagomez','arianagrande'];
  const IMP_SUFFIX = /^(official|officials|support|help|helpdesk|hq|app|store|shop|real|team|inc|co|usa|us|tv|music|gaming|game|live|news|bot)?$/;
  const IMP_PREFIX = /^(the|real|official|iam|im|its|x|mr|mrs|fake|not|thereal|join|team)$/;
  const FAN_OK = /(fan|fanpage|unofficial|parody|notreal|fake|tribute)/;

  function stripEnds(s) { return s.replace(/^\d+/, '').replace(/\d+$/, ''); }

  function matchesImpersonation(norm) {
    const base = stripEnds(norm);
    for (let i = 0; i < IMPERSONATE.length; i++) {
      const t = IMPERSONATE[i];
      if (base === t) return true;
      if (base.length > t.length && base.startsWith(t) && IMP_SUFFIX.test(base.slice(t.length))) return true;
      if (base.length > t.length && base.endsWith(t) && IMP_PREFIX.test(base.slice(0, base.length - t.length))) return true;
    }
    return false;
  }

  // Keyboard-smash heuristic — runs of adjacent keys / no vowels in a long string.
  const SMASH = ['asdf','sdfg','dfgh','fghj','ghjk','hjkl','qwer','wert','erty','rtyu','tyui','zxcv','xcvb','cvbn','asdfasdf','qwerty','qweqwe','jkjk'];
  function isKeyboardSmash(low) {
    const letters = low.replace(/[^a-z]/g, '');
    for (let i = 0; i < SMASH.length; i++) if (letters.indexOf(SMASH[i]) !== -1) return true;
    // long, vowel-less gibberish (e.g. "bcdfghjk")
    if (letters.length >= 7 && !/[aeiou]/.test(letters)) return true;
    return false;
  }

  // 17 — soft "flag for review" heuristic (subtle / coded / evasive). In this
  // preview we treat a flag as a block (no human queue); production would route
  // these to AI/human review instead of auto-rejecting.
  function suspicious(norm) {
    // collapse ALL repeats then re-test the hard list (defeats "n-i-g-g-e-r" style)
    const collapsed = norm.replace(/(.)\1+/g, '$1');
    for (let i = 0; i < CONTAINS.length; i++) {
      const t = CONTAINS[i];
      if (t.length >= 6 && collapsed.indexOf(t) !== -1) return true;
    }
    if (isBlocked(collapsed)) return true;
    return false;
  }

  function deny(code) { return { ok: false, flagged: false, code: code, message: UNAVAILABLE_MSG }; }

  // Main entry. Returns { ok, message?, code?(internal), flagged? }
  function checkUsername(raw) {
    const original = String(raw == null ? '' : raw);
    const trimmed = original.trim();

    // 15 — quality / length / charset / whitespace / excessive symbols
    if (original !== trimmed) return deny('whitespace');           // leading/trailing space
    if (trimmed.length < 3 || trimmed.length > 24) return deny('length');
    if (!/^[A-Za-z0-9_.]+$/.test(trimmed)) return deny('charset'); // letters/numbers/_/. only → blocks spaces, emoji, symbols
    if (/[_.]{3,}/.test(trimmed) || (trimmed.match(/[_.]/g) || []).length > 4) return deny('symbols');

    // 12 — spam: repeated chars / keyboard smash
    if (/(.)\1{3,}/.test(trimmed)) return deny('repeat');          // aaaa, 1111
    const low = trimmed.toLowerCase();
    if (isKeyboardSmash(low)) return deny('smash');

    // 13 — contact info: phone numbers / email-ish
    if (/\d{7,}/.test(trimmed.replace(/[_.]/g, ''))) return deny('phone');
    if (/(gmail|yahoo|hotmail|outlook|icloud|protonmail)(com|mail)?/.test(normalize(low))) return deny('email');

    const norm = normalize(trimmed);  // lowercase + leet-decode + letters-only + collapse triple repeats
    if (!norm) return deny('charset');
    // "bare" form: letters+digits, NO leet-decode, leading/trailing digits stripped.
    // Catches number-suffixed impersonation ("admin1", "elonmusk7") that leet-decoding
    // would otherwise corrupt (1→i, 7→t). We check both forms.
    const bare = String(trimmed).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^\d+/, '').replace(/\d+$/, '');

    // 18 — reserved (after stripping trailing digits, e.g. "admin1")
    if (RESERVED.has(stripEnds(norm)) || RESERVED.has(bare)) return deny('reserved');

    // 14 — deceptive authority
    for (let i = 0; i < DECEPTIVE.length; i++) if (norm.indexOf(DECEPTIVE[i]) !== -1) return deny('deceptive');

    // 1/2/3 — profanity, slurs, hate, harassment (existing word-list layers)
    if (isBlocked(original)) return deny('content');

    // 1/2 — short bypass-prone sexual/hate terms on the leet-decoded text (s3x, p0rn…)
    for (let i = 0; i < SHORT.length; i++) if (norm.indexOf(SHORT[i]) !== -1) return deny('content');

    // 4/6/7/11 + illegal/scam/extremist/contact — distinctive contains
    for (let i = 0; i < CONTAINS.length; i++) if (norm.indexOf(CONTAINS[i]) !== -1) return deny('content');

    // 8/9/10 — impersonation (fan names allowed when clearly unofficial)
    if ((matchesImpersonation(norm) || matchesImpersonation(bare)) && !FAN_OK.test(low)) return deny('impersonation');

    // 17 — AI review: subtle / evasive → flag (blocked here in preview)
    if (suspicious(norm)) return { ok: false, flagged: true, code: 'review', message: UNAVAILABLE_MSG };

    return { ok: true };
  }

  // ── Warning counter / ban ────────────────────────────────────────────
  const BAN_KEY  = 'coreModBan';      // { until: ts, reason }
  const WARN_KEY = 'coreModWarnings'; // { count, last, history: [{reason,ts}] }
  const BAN_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  function readWarn() {
    try { return JSON.parse(localStorage.getItem(WARN_KEY) || '{"count":0,"history":[]}'); } catch (e) { return { count: 0, history: [] }; }
  }
  function writeWarn(w) {
    try { localStorage.setItem(WARN_KEY, JSON.stringify(w)); } catch (e) {}
  }
  function readBan() {
    try { return JSON.parse(localStorage.getItem(BAN_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeBan(b) {
    try { localStorage.setItem(BAN_KEY, JSON.stringify(b)); } catch (e) {}
  }

  // Returns: { kind: 'warned' | 'banned', count, remaining, banUntil? }
  function warn(reason) {
    const existing = readBan();
    if (existing && existing.until > Date.now()) {
      return { kind: 'banned', banUntil: existing.until, count: 3, remaining: 0 };
    }
    const w = readWarn();
    w.count = (w.count || 0) + 1;
    w.last = Date.now();
    w.history = w.history || [];
    w.history.push({ reason: reason || 'violation', ts: Date.now() });
    if (w.history.length > 20) w.history = w.history.slice(-20);
    writeWarn(w);
    if (w.count >= 3) {
      const until = Date.now() + BAN_DURATION_MS;
      writeBan({ until, reason: reason || 'violation' });
      return { kind: 'banned', banUntil: until, count: w.count, remaining: 0 };
    }
    return { kind: 'warned', count: w.count, remaining: 3 - w.count };
  }

  // Returns null if not banned, or { until, daysLeft, reason }
  function checkBan() {
    const b = readBan();
    if (!b) return null;
    if (b.until <= Date.now()) {
      try { localStorage.removeItem(BAN_KEY); } catch (e) {}
      return null;
    }
    const daysLeft = Math.ceil((b.until - Date.now()) / (24 * 60 * 60 * 1000));
    return { until: b.until, daysLeft, reason: b.reason };
  }

  function reset() {
    try {
      localStorage.removeItem(WARN_KEY);
      localStorage.removeItem(BAN_KEY);
    } catch (e) {}
  }

  // Auto-enforce on page load — if a ban is active, redirect to 83-banned.html
  // (unless we're already there or on neutral pages like sign-in, legal, crisis).
  function autoEnforce() {
    const ban = checkBan();
    if (!ban) return;
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    const SAFE = new Set(['83-banned.html','sign-in.html','legal.html','crisis.html','64-u-profile.html','']);
    if (SAFE.has(path)) return;
    location.replace('83-banned.html');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoEnforce);
  } else {
    autoEnforce();
  }

  window.coreModeration = {
    isBlocked, checkUsername, UNAVAILABLE_MSG, warn, checkBan, reset, normalize
  };
})();
