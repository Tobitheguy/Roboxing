/**
 * Photography and long-form reading for the machines.
 *
 * This lives in code, not the database, for the same reason post bodies do
 * (see scripts/seed-content.ts): the images ship in /public with the build,
 * so the mapping that describes them belongs in the same commit that adds or
 * removes a file. A DB row pointing at an image that was never deployed is a
 * broken page; a code map cannot drift from the assets it references.
 *
 * Every image is credited. We are a media site using manufacturer and league
 * photography editorially — the credit line is what makes that honest.
 */

export type MachineImage = {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  width: number;
  height: number;
  /**
   * "contain" for studio shots whose framing must survive intact — a square
   * product photo cropped to 16:9 loses the head and feet, which on a page
   * about the physical machine is the one thing that cannot happen. Cover
   * remains the default because fight photography crops fine.
   */
  fit?: "cover" | "contain";
};

export type Stat = { label: string; value: string };

export type AnatomyPoint = {
  /** Percentage coordinates on the view image, 0–100. */
  x: number;
  y: number;
  label: string;
  detail?: string;
};

export type AnatomyView = {
  image: MachineImage;
  title: string;
  points: AnatomyPoint[];
};

export type Feature = {
  image: MachineImage;
  title: string;
  text: string;
};

export type Showcase = {
  eyebrow: string;
  tagline: string;
  hero: MachineImage;
  heroTone?: "dark" | "light";
  stats: Stat[];
  anatomy: AnatomyView[];
  features: Feature[];
  /** Named machines fielded on this platform, linking fighter pages back. */
  variants?: { slug: string; name: string; note: string }[];
};

export type MachineMedia = {
  /** Shown on the index card and anywhere a thumbnail is wanted. */
  card: MachineImage;
  /** The photo pair on the detail page — front and back where we have them. */
  gallery: MachineImage[];
  /** Long-form paragraphs for reading up on the platform. Plain text only. */
  reading: string[];
  /** Platform pages (T800, G1) get the full presentation treatment. */
  showcase?: Showcase;
  /**
   * Fighter machines (White Eagle, Matador) are league-standard hardware in
   * team colours — this points their page at the platform that explains the
   * metal, instead of duplicating it.
   */
  platformSlug?: string;
  platformName?: string;
};

const T800_DUO: MachineImage = {
  src: "/machines/t800-duo.webp",
  alt: "Two EngineAI T800 robots sparring — one seen from behind, one airborne facing the camera",
  caption: "Front and back in one frame: the T800's dark carbon back plate and its white armoured front.",
  credit: "EngineAI",
  width: 1920,
  height: 960,
};

const URKL_FLYING_KICK: MachineImage = {
  src: "/machines/urkl-flying-kick.jpg",
  alt: "White Eagle airborne mid flying-kick against Matador in the URKL cage, Shenzhen",
  caption:
    "The moment the sport is best known for — White Eagle's flying kick, URKL opening night, Shenzhen, 16 July 2026.",
  credit: "URKL / EngineAI",
  width: 1280,
  height: 720,
};

const URKL_MATADOR_FRONT: MachineImage = {
  src: "/machines/urkl-matador-front.jpg",
  alt: "Matador's dark-armoured T800 facing the camera in the URKL cage while White Eagle attacks from the side",
  caption: "Matador from the front — dark armour, URKL chest plate — during the opening bout.",
  credit: "URKL / EngineAI",
  width: 1280,
  height: 720,
};

const URKL_WHITE_EAGLE_BACK: MachineImage = {
  src: "/machines/urkl-white-eagle-back.jpg",
  alt: "White Eagle seen from behind, standing over a downed Matador in round five of the URKL opening bout",
  caption:
    "White Eagle from behind in round five, Matador down — the round White Eagle won 29–15 while losing the bout 2–3.",
  credit: "URKL broadcast",
  width: 1540,
  height: 852,
};

const T800_SHOWCASE: Showcase = {
  eyebrow: "EngineAI · standard platform of URKL and CyberHero",
  tagline:
    "The only fighting machine built at the size of an adult human. Every URKL and CyberHero bout is two of these — identical hardware, different software, different armour.",
  hero: {
    src: "/machines/t800-hero.jpg",
    alt: "EngineAI T800 in guard stance, lit against a black background",
    caption: "",
    credit: "EngineAI",
    width: 750,
    height: 1334,
  },
  heroTone: "dark",
  stats: [
    { label: "Height", value: "173 cm" },
    { label: "Weight", value: "75 kg" },
    { label: "Body joints", value: "29 DOF" },
    { label: "Peak torque", value: "450 N·m" },
    { label: "Top speed", value: "3 m/s" },
    { label: "Battery", value: "72 V quick-release" },
  ],
  anatomy: [
    {
      title: "Front",
      image: {
        src: "/machines/t800-front.jpg",
        alt: "EngineAI T800 running toward the camera, full body from the front",
        caption: "",
        credit: "EngineAI",
        width: 1400,
        height: 833,
      },
      points: [
        { x: 73, y: 10, label: "Impact-resistant helmet", detail: "automotive-grade light strip, 2-DOF neck" },
        { x: 72.5, y: 17, label: "Visual perception sensors", detail: "AI camera array behind the visor" },
        { x: 73.5, y: 33, label: "Chest sensor core", detail: "second perception module and microphone" },
        { x: 57, y: 17, label: "7-DOF hands", detail: "five-fingered, fully articulated" },
        { x: 72.5, y: 45, label: "1-DOF waist", detail: "the pivot behind spinning techniques" },
        { x: 67, y: 60, label: "6-DOF legs", detail: "active-cooled joints, 450 N·m peak" },
        { x: 64, y: 88, label: "Bionic noise-reducing feet" },
      ],
    },
    {
      title: "Back",
      // Cropped to exactly the front view's aspect ratio so the two figures
      // land at the same rendered height side by side.
      image: {
        src: "/machines/t800-back.jpg",
        alt: "EngineAI T800 upper body from behind, showing the removable battery pack",
        caption: "",
        credit: "EngineAI",
        width: 1814,
        height: 1080,
      },
      points: [
        { x: 31, y: 16, label: "Cooling intake", detail: "active airflow for the drivetrain" },
        { x: 64.5, y: 45, label: "Removable fast-charging battery", detail: "72 V quick-release pack" },
        { x: 38, y: 55, label: "Status light strip" },
        { x: 14, y: 38, label: "7-DOF arms", detail: "shoulder, elbow and wrist articulation" },
        { x: 50, y: 82, label: "Magnesium-aluminium alloy body", detail: "aviation-grade panelling" },
      ],
    },
  ],
  features: [
    {
      image: {
        src: "/machines/t800-hand.jpg",
        alt: "Close-up of the T800's five-fingered dexterous hand",
        caption: "",
        credit: "EngineAI",
        width: 1920,
        height: 1080,
      },
      title: "Hands that close into fists",
      text: "Seven degrees of freedom per hand — five fingers that grip, block and punch. In fight trim they wear padded gloves.",
    },
    {
      image: {
        src: "/machines/t800-joint.jpg",
        alt: "Transparent render of the T800's joint actuator internals",
        caption: "",
        credit: "EngineAI",
        width: 1920,
        height: 1080,
      },
      title: "450 N·m in every strike",
      text: "The joint actuators peak at 450 newton-metres — the torque budget behind flying kicks, 360° aerials and fast recovery off the floor.",
    },
    {
      image: {
        src: "/machines/t800-head.jpg",
        alt: "The T800's helmet and visor with the AI camera array visible",
        caption: "",
        credit: "EngineAI",
        width: 1920,
        height: 1080,
      },
      title: "Eyes behind the visor",
      text: "A depth-camera array reads the opponent while the operator calls intent — the machine itself owns balance, footwork and execution.",
    },
  ],
  variants: [
    { slug: "white-eagle-t800", name: "White Eagle", note: "white armour · the flying kick" },
    { slug: "matador-t800", name: "Matador", note: "dark armour · won URKL's opening bout headless" },
  ],
};

const G1_SHOWCASE: Showcase = {
  eyebrow: "Unitree Robotics · the machine that fought first",
  tagline:
    "Child-sized, cheap enough to crash and agile enough to headline — the most widely used humanoid in combat events anywhere, from Hangzhou to San Francisco.",
  hero: {
    src: "/machines/g1-hero.jpg",
    alt: "Unitree G1 landing a kick in the ring at Iron Fist King: Awakening, Hangzhou",
    caption: "",
    credit: "Unitree Robotics / Iron Fist King broadcast",
    width: 1280,
    height: 720,
  },
  heroTone: "dark",
  stats: [
    { label: "Height", value: "130 cm" },
    { label: "Weight", value: "≈35 kg" },
    { label: "Joints", value: "23–43 DOF" },
    { label: "Knee torque", value: "90 N·m" },
    { label: "First bout", value: "May 2025" },
    { label: "Base price", value: "≈$13,500" },
  ],
  anatomy: [
    {
      title: "Front",
      image: {
        src: "/machines/g1-front.jpg",
        alt: "Unitree G1 humanoid robot standing, seen from the front",
        caption: "",
        credit: "Unitree Robotics",
        width: 800,
        height: 800,
      },
      points: [
        { x: 52, y: 11, label: "Illuminated face strip", detail: "depth-sensing head module" },
        { x: 51, y: 30, label: "Torso battery and compute", detail: "trained by imitation and reinforcement learning" },
        { x: 56, y: 49, label: "Gloved hands", detail: "padded for fight trim; dexterous options up to 43 DOF total" },
        { x: 45, y: 66, label: "90 N·m knees", detail: "enough for hooks, side kicks and getting back up" },
        { x: 41, y: 91, label: "Compact feet", detail: "2 m/s walking, stable on one leg mid-kick" },
      ],
    },
    {
      // Same 1:1 frame as the front view, so the pair sits level — the
      // annotated figure and the move it exists to throw.
      title: "In action",
      image: {
        src: "/machines/g1-kick.jpg",
        alt: "Unitree G1 mid high-kick, showing the side and back of the machine",
        caption: "",
        credit: "Unitree Robotics",
        width: 800,
        height: 800,
      },
      points: [],
    },
  ],
  // The T800's tiles show engineering close-ups; the G1 has something the
  // T800 does not — a combat record across three formats. That is its
  // feature set.
  features: [
    {
      image: {
        src: "/machines/g1-ifk.jpg",
        alt: "Two G1s exchanging kicks in the Iron Fist King ring with a referee behind them",
        caption: "",
        credit: "Iron Fist King broadcast",
        width: 980,
        height: 720,
      },
      title: "Iron Fist King · Hangzhou",
      text: "May 2025 — the first robot boxing tournament ever held. Four G1s, human operators, and the night this sport started.",
    },
    {
      image: {
        src: "/machines/g1-whrg.jpg",
        alt: "G1s in red and black protective gear fighting in the WHRG kickboxing bracket",
        caption: "",
        credit: "World Humanoid Robot Games broadcast",
        width: 980,
        height: 720,
      },
      title: "WHRG kickboxing · Beijing",
      text: "August 2026 — the kickboxing bracket of the World Humanoid Robot Games, fought in full contact gear with team numbers on the vest.",
    },
    {
      image: {
        src: "/machines/g1-rek.jpg",
        alt: "Two modified G1s in boxing gloves squaring up at REK in San Francisco",
        caption: "",
        credit: "REK",
        width: 520,
        height: 320,
      },
      title: "REK · San Francisco",
      text: "The first robot fighting on US soil — modified G1s under VR control, piloted by professional MMA fighters.",
    },
  ],
};

const G1_IFK: MachineImage = {
  src: "/machines/g1-ifk.jpg",
  alt: "Two G1s exchanging kicks in the Iron Fist King ring with a referee behind them",
  caption:
    "Iron Fist King: Awakening, Hangzhou, May 2025 — the tournament AI Strategist won.",
  credit: "Iron Fist King broadcast",
  width: 980,
  height: 720,
};

/*
 * CARDS TAKE PHOTOGRAPHS WITH A BACKGROUND, NOT CUT-OUTS.
 *
 * g1-front.jpg is a manufacturer studio shot on white. Under the old light
 * skin that sat flush with the page; on void it is a lit white rectangle in
 * a grid of dark ones — the same white-square problem as the league marks,
 * except the white is in the pixels and no token can reach it. The studio
 * views keep their place in the showcase, where a reader expects a catalogue
 * photograph. The card gets the machine in a ring.
 */
const G1_RING: MachineImage = {
  src: "/machines/g1-hero.jpg",
  alt: "Unitree G1 landing a kick in the ring at Iron Fist King: Awakening, Hangzhou",
  caption:
    "The G1 in the ring at Iron Fist King — 1.3 m, and the platform most of this sport is fought on.",
  credit: "Unitree Robotics / Iron Fist King broadcast",
  width: 1280,
  height: 720,
};

const G1_WHRG: MachineImage = {
  src: "/machines/g1-whrg.jpg",
  alt: "G1s in red and black protective gear fighting in the WHRG kickboxing bracket",
  caption:
    "The kickboxing bracket of the World Humanoid Robot Games, Beijing — G1s in full contact gear.",
  credit: "World Humanoid Robot Games broadcast",
  width: 980,
  height: 720,
};

const H2_GUARD: MachineImage = {
  src: "/machines/h2-guard.jpg",
  alt: "Unitree H2 humanoid robot standing in a boxing guard outside a stadium at night",
  caption:
    "The H2 in a fighting guard — adult scale, about 1.8 m and 70 kg.",
  credit: "Unitree Robotics",
  width: 3840,
  height: 2160,
};

const H2_SCALE: MachineImage = {
  src: "/machines/h2-scale.jpg",
  alt: "Unitree H2 walking beside a man in a corridor, both roughly the same height",
  caption:
    "Walking beside a person, clothed — the clearest published record of how big this machine actually is.",
  credit: "Unitree Robotics",
  width: 3840,
  height: 2160,
};

const H1_STANCE: MachineImage = {
  src: "/machines/h1-stance.jpg",
  alt: "Unitree H1 humanoid robot mid-stride in front of a concrete wall",
  caption:
    "The H1 platform, from the product page Unitree publishes the H1-2 under.",
  credit: "Unitree Robotics",
  width: 1920,
  height: 1080,
};

const H1_KICK: MachineImage = {
  src: "/machines/h1-kick.jpg",
  alt: "A man kicking a Unitree H1 humanoid robot, which stays upright",
  caption:
    "Unitree's own robustness demonstration — kicked hard, still standing.",
  credit: "Unitree Robotics",
  width: 1920,
  height: 1080,
};

const T1_PITCH: MachineImage = {
  src: "/machines/t1-pitch.webp",
  alt: "Booster T1 humanoid robot running at a football on a stadium pitch",
  caption:
    "The T1 on a pitch — a RoboCup AdultSize champion, and an autonomous machine rather than a piloted one.",
  credit: "Booster Robotics",
  width: 5120,
  height: 1600,
};

export const MACHINE_MEDIA: Record<string, MachineMedia> = {
  "engineai-t800": {
    card: T800_DUO,
    // The showcase carries the studio views — the gallery is the machine at
    // work, in the cage.
    gallery: [URKL_FLYING_KICK, URKL_WHITE_EAGLE_BACK],
    showcase: T800_SHOWCASE,
    reading: [
      "The T800 is the reason most of this sport looks the way it does. EngineAI unveiled it in February 2026 as a full-size fighting platform — 1.73 metres and 75 kilograms with battery, which makes it the only machine in combat use that is genuinely the size of an adult human. URKL and CyberHero both run entire cards on it, in identical trim, so every difference you see in the cage is software, operator and armour colour, never hardware.",
      "The body carries 29 articulated joints with 450 newton-metres of peak joint torque — enough for uppercuts, spinning kicks, 360-degree aerial rotations and, critically, getting back up at speed after a knockdown. The shell is aviation-grade aluminium panelling. An active cooling system in the leg joints keeps it in high-intensity operation for hours rather than minutes, on a quick-release 72-volt battery.",
      "It sees with a depth-camera array plus LiDAR and radar coverage, and in URKL configuration it fights as a shared-control machine: the operator gives high-level intent from a handheld remote — where to stand, when to advance, which technique to trigger — while onboard systems own balance, stabilisation and the actual execution of the movement. That split is what let a headless machine keep fighting in Shenzhen: losing the head module costs the primary vision hardware, not the torso's ability to balance and strike.",
      "EngineAI supplies the machines to competing teams rather than selling them into the league. Public pricing reports have ranged from about $25,000 pre-order to $40,000. The company also sells the FA01 fighting armour as a separate accessory and encourages teams to develop their own protection — which is where the sport's visual identity, White Eagle's white plate against Matador's dark carbon, comes from.",
    ],
  },
  "unitree-g1": {
    card: G1_RING,
    // Both studio shots live in the showcase (anatomy pair) — nothing left
    // for a separate gallery.
    gallery: [],
    showcase: G1_SHOWCASE,
    reading: [
      "The G1 is the machine that fought the first robot boxing match in history — Iron Fist King: Awakening, Hangzhou, May 2025 — and it is still the most widely used humanoid in combat events anywhere. At 1.3 metres and roughly 35 kilograms it is child-sized next to a T800, which is exactly why it got there first: it is cheap enough to field in numbers, light enough to crash without consequence, and agile enough to be genuinely fun to watch.",
      "The standard machine runs 23 degrees of freedom, expandable to 43 with the dexterous-hand options, with up to 90 newton-metres of knee joint torque. That is enough for hooks, side kicks, spinning strikes and — the capability audiences actually came for — getting back up off the floor unassisted. Its control stack is trained by imitation and reinforcement learning.",
      "Its combat record spans three formats: Unitree's own Iron Fist King tournaments in Hangzhou, the kickboxing bracket of the World Humanoid Robot Games in Beijing, and REK's fights in San Francisco — the first robot fighting on US soil — where the machines are modified G1s fought under VR control. When you see a small humanoid throw a hook anywhere in the world, it is almost certainly this platform.",
      "At a reported price around $13,500 for the base configuration, the G1 is the accessible end of this sport — several university teams' entire combat programmes run on it. Unitree followed it with the larger H-series, but as of this season the G1 remains the platform every smaller-format fight card is built on.",
    ],
  },
  /*
   * THE G1 MACHINES.
   *
   * AI Strategist, Energy Guardian and the EDU Combat Edition are all Unitree
   * G1s. They are not separate designs and there is no separate photography of
   * them to find — the Iron Fist King broadcast frames below ARE these two
   * fighters, in that tournament, and the studio views are the chassis all
   * three run. Giving each one the platform banner is the same seam already
   * used for Matador and White Eagle on the T800: the fighter is the entry,
   * the G1 is the hardware, and the page says which is which rather than
   * implying a machine nobody has photographed.
   */
  "ai-strategist-g1": {
    card: G1_IFK,
    platformSlug: "unitree-g1",
    platformName: "Unitree G1",
    gallery: [G1_IFK, G1_RING],
    reading: [
      "AI Strategist (AI算策师) won the first Iron Fist King tournament in Hangzhou on 25 May 2025 — the first humanoid robot boxing tournament ever staged, and therefore the first champion this sport produced. It was piloted by Lu Xin.",
      "The machine is a stock Unitree G1: 1.32 metres, about 35 kilograms, no reinforcement package. Every G1 in that tournament was identical hardware, which makes the 2025 bracket the cleanest demonstration in the sport's short record that the result belonged to the operator and the control stack rather than the metal.",
      "Iron Fist King ran under Unitree's own banner with a CMG broadcast, remote-piloted throughout, with the machines' movement trained from motion capture of professional kickboxers. Nothing in that tournament was autonomous.",
    ],
  },
  "energy-guardian-g1": {
    card: G1_IFK,
    platformSlug: "unitree-g1",
    platformName: "Unitree G1",
    gallery: [G1_IFK, G1_RING],
    reading: [
      "Energy Guardian was runner-up in the first Iron Fist King final on 25 May 2025, piloted by Hu Yunqian — the other half of the first tournament final in humanoid fighting.",
      "Like its opponent it is a stock Unitree G1 at 1.32 metres and roughly 35 kilograms. Iron Fist King fielded identical machines to every team by design.",
      "Beyond the final, no round-by-round scoring for this machine has been published in any language the record can cite. What is here is what is sourced.",
    ],
  },
  "unitree-g1-combat": {
    card: G1_WHRG,
    platformSlug: "unitree-g1",
    platformName: "Unitree G1",
    gallery: [G1_WHRG, G1_RING],
    reading: [
      "The G1 EDU Combat Edition is what Unitree sells when the buyer intends the machine to be hit. It is a G1 with a reinforced waist and arms, a Jetson Orin NX compute module, gloves and a helmet — the reinforcement is the entire product, because a standard G1 is not built to absorb repeated impact.",
      "It is sold into the United States through Robots International in Las Vegas at a reported $63,900, roughly five times the base G1. It ships with a repair subsidy rather than a warranty, which is the vendor's own acknowledgement that a fighting robot is a consumable.",
      "Photography here is of the G1 chassis. Unitree has not published studio views of the combat trim specifically, and this record does not pass a standard G1 off as one.",
    ],
  },
  /*
   * H2, H1-2, T1 — photography sourced from the manufacturers' own product
   * pages, September 2026. Each frame was opened and looked at before it was
   * wired up, because the first four candidates pulled off unitree.com were
   * quadrupeds from a navigation grid and one Booster image whose alt text
   * said "t1" while its link went to /booster-t2. A URL that sounds right is
   * not a photograph of the machine.
   */
  "unitree-h2": {
    card: H2_GUARD,
    gallery: [H2_GUARD, H2_SCALE],
    reading: [
      "The H2 is Unitree's full-size humanoid and the headline machine for CMG's 2026 competition. It stands about 1.8 metres and weighs roughly 70 kilograms — adult scale, in the same class as EngineAI's T800 and a different animal entirely from the 1.3-metre G1 that most fight cards are built on.",
      "Unitree gives it 31 degrees of freedom: six per leg, seven per arm, three at the waist and two in the head. Peak joint torque is quoted at 360 newton-metres in the legs and 120 in the arms. It is the first Unitree humanoid with a bionic face, which is a statement about where the company wants the machine to go rather than anything to do with fighting.",
      "Its appearance in this record is the December 2025 sparring video against a G1 — and the important detail of that clip is that the H2 was driven by a full-body motion-capture suit, not by autonomy. Every strike in it was a person's.",
      "Unitree does not publish a list price for the H2. Third-party resellers quote figures; this record does not repeat them as fact. On US availability, the H2 was authorized before the July 2026 FCC notice, so existing units are unaffected.",
    ],
  },
  "unitree-h1-2": {
    card: H1_STANCE,
    gallery: [H1_STANCE, H1_KICK],
    reading: [
      "The H1-2 is the current revision of Unitree's first full-size humanoid, at roughly 1.83 metres and 70 kilograms. REK is moving its San Francisco cards onto it — a deliberate step up from the modified G1s the league started with, and the first time an American promotion has put adult-scale machines in the ring.",
      "REK founder Cix Liv described being hit by one as \"like a motorized bat\". It is the most useful single sentence anyone in this sport has said about scale: the difference between a G1 bout and a full-size bout is not a matter of degree, and the safety case changes with it.",
      "Reported pricing is around $100,000. Unitree does not publish a list price, so that figure travels with the caveat rather than without it.",
      "Photography here is of the H1 platform, from Unitree's own product page — the page the company publishes the H1-2 under. Unitree has not released studio views of the H1-2 revision specifically, and this record will not label an H1 frame as one.",
    ],
  },
  "booster-t1": {
    card: T1_PITCH,
    gallery: [T1_PITCH],
    reading: [
      "The Booster T1 is the odd entry in this record: a machine with a serious competitive pedigree that was never built to fight. Booster sells it as a developer platform — roughly 1.2 metres and 30 kilograms, 23 to 41 degrees of freedom depending on configuration, about two hours of walking or four hours standing on a charge.",
      "It is the championship model from the RoboCup Soccer \"AdultSize\" category, which is autonomous humanoid football: no operator, no remote, the machine reading the pitch and deciding for itself. That is the opposite end of the control spectrum from URKL's shared-control T800s or Iron Fist King's remote-piloted G1s, and it is why the T1 is worth watching even though it has never won a fight.",
      "UFB has run it alongside the G1 at its San Francisco events. Reported price is about $33,949.",
      "Booster's own site now leads with the newer T2 and K1 platforms; the T1 keeps its own product page. The photograph is Booster's official product image, which is a render rather than a press photograph — flagged here because this record distinguishes the two.",
    ],
  },
  "white-eagle-t800": {
    card: URKL_FLYING_KICK,
    platformSlug: "engineai-t800",
    platformName: "EngineAI T800",
    gallery: [
      URKL_FLYING_KICK,
      URKL_WHITE_EAGLE_BACK,
    ],
    reading: [
      "White Eagle (白色雄鹰) is the white-armoured T800 that produced the single most-seen moment in this sport's short history: a flying kick on URKL's opening night in Shenzhen, 16 July 2026, that took the head module clean off its opponent Matador. The clip passed hundreds of millions of plays within days and is, for most of the world, the first robot fight they ever saw.",
      "The machine is league-standard hardware — the same T800 every URKL team fields, distinguished only by its white armour plating. Whatever White Eagle does differently to Matador is its team's software and operator craft, not the metal.",
      "The bout itself is the sport's first great cautionary tale about highlights: White Eagle landed the kick, danced for the crowd, and lost. Matador had banked the earlier rounds, kept fighting headless on the T800's distributed torso control, and took the decision 3–2 over five rounds. White Eagle won round five 29–15 — the round in the photograph — but the fight was already gone.",
      "Both Chinese-language records of the bout — Guangzhou's Huacheng and People's Daily — score it 3–2 to Matador, which is why that is the result on this site while parts of the English-language press still credit the machine that threw the kick.",
    ],
  },
  "matador-t800": {
    card: URKL_MATADOR_FRONT,
    platformSlug: "engineai-t800",
    platformName: "EngineAI T800",
    gallery: [
      URKL_MATADOR_FRONT,
      {
        ...URKL_FLYING_KICK,
        caption:
          "Matador from behind at the moment of the kick that removed its head — it finished the fight anyway.",
      },
    ],
    reading: [
      "Matador (斗牛士, also translated \"Bullfighter\" in some English coverage) is the dark-armoured T800 that won URKL's opening bout in Shenzhen on 16 July 2026 — the first verified result in the league's history, and the strangest winning performance this sport has yet produced.",
      "In the closing stretch of the fight, White Eagle's flying kick removed Matador's head module entirely. The head carries the T800's primary vision hardware; the torso carries the balance and motion control. Matador fought on headless — blocking, punching, staying upright on distributed torso control — and finished all five rounds.",
      "It won because it had already built the lead: 3–2 on rounds when the scores were totalled. The image of a decapitated machine being carried off stage in victory while its opponent stood to take the applause is the sport's founding paradox — the highlight and the result belonged to different robots.",
      "Like every URKL machine, Matador is league-standard T800 hardware in team colours. Its win is the clearest demonstration to date of what the platform's shared-control architecture actually buys: the machine does not need its head to keep fighting.",
    ],
  },
};

export function getMachineMedia(slug: string): MachineMedia | null {
  return MACHINE_MEDIA[slug] ?? null;
}
