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
};

export type MachineMedia = {
  /** Shown on the index card and anywhere a thumbnail is wanted. */
  card: MachineImage;
  /** The photo pair on the detail page — front and back where we have them. */
  gallery: MachineImage[];
  /** Long-form paragraphs for reading up on the platform. Plain text only. */
  reading: string[];
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

export const MACHINE_MEDIA: Record<string, MachineMedia> = {
  "engineai-t800": {
    card: T800_DUO,
    gallery: [T800_DUO, URKL_FLYING_KICK],
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
    },
    gallery: [
      {
        src: "/machines/g1-front.jpg",
        alt: "Unitree G1 humanoid robot standing, seen from the front",
        caption: "From the front: the G1's illuminated face strip and gloved hands in fight trim.",
        credit: "Unitree Robotics",
        width: 800,
        height: 800,
      },
      {
        src: "/machines/g1-kick.jpg",
        alt: "Unitree G1 mid high-kick, showing the side and back of the machine",
        caption: "Mid high-kick — the move that filled arenas before full-size machines existed.",
        credit: "Unitree Robotics",
        width: 800,
        height: 800,
      },
    ],
    reading: [
      "The G1 is the machine that fought the first robot boxing match in history — Iron Fist King: Awakening, Hangzhou, May 2025 — and it is still the most widely used humanoid in combat events anywhere. At 1.3 metres and roughly 35 kilograms it is child-sized next to a T800, which is exactly why it got there first: it is cheap enough to field in numbers, light enough to crash without consequence, and agile enough to be genuinely fun to watch.",
      "The standard machine runs 23 degrees of freedom, expandable to 43 with the dexterous-hand options, with up to 90 newton-metres of knee joint torque. That is enough for hooks, side kicks, spinning strikes and — the capability audiences actually came for — getting back up off the floor unassisted. Its control stack is trained by imitation and reinforcement learning.",
      "Its combat record spans three formats: Unitree's own Iron Fist King tournaments in Hangzhou, the kickboxing bracket of the World Humanoid Robot Games in Beijing, and REK's fights in San Francisco — the first robot fighting on US soil — where the machines are modified G1s fought under VR control. When you see a small humanoid throw a hook anywhere in the world, it is almost certainly this platform.",
      "At a reported price around $13,500 for the base configuration, the G1 is the accessible end of this sport — several university teams' entire combat programmes run on it. Unitree followed it with the larger H-series, but as of this season the G1 remains the platform every smaller-format fight card is built on.",
    ],
  },
  "white-eagle-t800": {
    card: URKL_FLYING_KICK,
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
