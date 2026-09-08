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
      image: {
        src: "/machines/t800-back.jpg",
        alt: "EngineAI T800 upper body from behind, showing the removable battery pack",
        caption: "",
        credit: "EngineAI",
        width: 1920,
        height: 1080,
      },
      points: [
        { x: 29, y: 16, label: "Cooling intake", detail: "active airflow for the drivetrain" },
        { x: 61, y: 45, label: "Removable fast-charging battery", detail: "72 V quick-release pack" },
        { x: 36, y: 55, label: "Status light strip" },
        { x: 13, y: 38, label: "7-DOF arms", detail: "shoulder, elbow and wrist articulation" },
        { x: 47, y: 82, label: "Magnesium-aluminium alloy body", detail: "aviation-grade panelling" },
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
    src: "/machines/g1-front.jpg",
    alt: "Unitree G1 humanoid robot standing, seen from the front",
    caption: "",
    credit: "Unitree Robotics",
    width: 800,
    height: 800,
    fit: "contain",
  },
  heroTone: "light",
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
  ],
  features: [],
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
    card: {
      src: "/machines/g1-front.jpg",
      alt: "Unitree G1 humanoid robot standing, seen from the front",
      caption: "The G1 in standard trim — 1.3 metres, the most widely used humanoid in combat events.",
      credit: "Unitree Robotics",
      width: 800,
      height: 800,
      fit: "contain",
    },
    // The front view lives in the showcase hero and anatomy — the gallery
    // keeps only the action shot.
    gallery: [
      {
        src: "/machines/g1-kick.jpg",
        alt: "Unitree G1 mid high-kick, showing the side and back of the machine",
        caption: "Mid high-kick — the move that filled arenas before full-size machines existed.",
        credit: "Unitree Robotics",
        width: 800,
        height: 800,
        fit: "contain",
      },
    ],
    showcase: G1_SHOWCASE,
    reading: [
      "The G1 is the machine that fought the first robot boxing match in history — Iron Fist King: Awakening, Hangzhou, May 2025 — and it is still the most widely used humanoid in combat events anywhere. At 1.3 metres and roughly 35 kilograms it is child-sized next to a T800, which is exactly why it got there first: it is cheap enough to field in numbers, light enough to crash without consequence, and agile enough to be genuinely fun to watch.",
      "The standard machine runs 23 degrees of freedom, expandable to 43 with the dexterous-hand options, with up to 90 newton-metres of knee joint torque. That is enough for hooks, side kicks, spinning strikes and — the capability audiences actually came for — getting back up off the floor unassisted. Its control stack is trained by imitation and reinforcement learning.",
      "Its combat record spans three formats: Unitree's own Iron Fist King tournaments in Hangzhou, the kickboxing bracket of the World Humanoid Robot Games in Beijing, and REK's fights in San Francisco — the first robot fighting on US soil — where the machines are modified G1s fought under VR control. When you see a small humanoid throw a hook anywhere in the world, it is almost certainly this platform.",
      "At a reported price around $13,500 for the base configuration, the G1 is the accessible end of this sport — several university teams' entire combat programmes run on it. Unitree followed it with the larger H-series, but as of this season the G1 remains the platform every smaller-format fight card is built on.",
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
