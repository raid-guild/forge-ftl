export type Phase = "ready" | "combat" | "story" | "chest" | "shop" | "game-over" | "won";
export type HeroId = "fighter" | "wizard" | "bard" | "donkey";
export type RoomType = "combat" | "story" | "chest";
export type ShopServiceId = "healAll" | "reviveOne";
export type SpecialId = "shieldBreaker" | "chainSpark" | "purpleEncore" | "panicKick";
export type Task = "attack" | "repair-aura";
export type UpgradeId =
  | "attackPower"
  | "attackSpeed"
  | "repairPower"
  | "repairSpeed"
  | "fighterHp"
  | "wizardHp"
  | "bardHp"
  | "donkeyHp"
  | "manaRecharge"
  | "maxMana";

export interface Hero {
  id: HeroId;
  name: string;
  role: string;
  sprite: number;
  spriteSheet?: "characters" | "donkey";
  hp: number;
  maxHp: number;
  task: Task | null;
  targetId: string | null;
  progress: number;
  charge: number;
}

export interface Enemy {
  id: string;
  name: string;
  sprite: number;
  bossPart?: "head" | "left-claw" | "right-claw" | "wings" | "heart";
  attackLabel?: string;
  hp: number;
  maxHp: number;
  damage: number;
  attackEvery: number;
  attackTimer: number;
}

export interface FloatText {
  id: number;
  text: string;
  side: "party" | "enemy" | "center";
  ttl: number;
}

export interface CombatEffect {
  id: number;
  kind: "slash" | "spark" | "music" | "kick" | "repair" | "aura-hit" | "special";
  side: "party" | "enemy" | "center";
  sourceId?: HeroId;
  targetId?: string;
  ttl: number;
}

export interface RoomEvent {
  type: Exclude<RoomType, "combat">;
  title: string;
  body: string;
  reward: number;
}

export interface GameState {
  phase: Phase;
  floor: number;
  maxFloor: number;
  mana: number;
  maxMana: number;
  aura: number;
  maxAura: number;
  gold: number;
  score: number;
  selectedHero: HeroId | null;
  focusedEnemyId: string | null;
  party: Hero[];
  enemies: Enemy[];
  roomEvent: RoomEvent | null;
  floats: FloatText[];
  effects: CombatEffect[];
  nextFloatId: number;
  nextEffectId: number;
  log: string[];
  upgrades: {
    attackPower: number;
    attackSpeed: number;
    repairPower: number;
    repairSpeed: number;
    fighterHp: number;
    wizardHp: number;
    bardHp: number;
    donkeyHp: number;
    manaRecharge: number;
    maxMana: number;
  };
}

export type Action =
  | { type: "start" }
  | { type: "tick"; dt: number }
  | { type: "select-hero"; heroId: HeroId }
  | { type: "focus-enemy"; enemyId: string }
  | { type: "assign"; task: Task }
  | { type: "special"; heroId: HeroId }
  | { type: "buy"; upgrade: UpgradeId }
  | { type: "buy-service"; service: ShopServiceId }
  | { type: "claim-room" }
  | { type: "next-floor" }
  | { type: "restart" };

const AURA_REPAIR_COST = 10;
export const SPECIAL_CHARGE_MAX = 100;
const BASE_GOLD_REWARD = 10;
const GOLD_PER_FLOOR = 4;
const STORY_REWARD_MULTIPLIER = 0.7;
const CHEST_REWARD_MULTIPLIER = 1.3;
const TASKS: Record<Task, { seconds: number; label: string }> = {
  attack: { seconds: 1.05, label: "Attack" },
  "repair-aura": { seconds: 1.35, label: "Repair Aura" },
};

const BASE_PARTY: Hero[] = [
  {
    id: "fighter",
    name: "Fighter",
    role: "Guard",
    sprite: 13,
    hp: 38,
    maxHp: 38,
    task: null,
    targetId: null,
    progress: 0,
    charge: 0,
  },
  {
    id: "wizard",
    name: "Wizard",
    role: "Battery",
    sprite: 14,
    hp: 26,
    maxHp: 26,
    task: null,
    targetId: null,
    progress: 0,
    charge: 0,
  },
  {
    id: "bard",
    name: "Bard",
    role: "Tinker",
    sprite: 0,
    hp: 30,
    maxHp: 30,
    task: null,
    targetId: null,
    progress: 0,
    charge: 0,
  },
  {
    id: "donkey",
    name: "Donkey",
    role: "Pack Mule",
    sprite: 0,
    spriteSheet: "donkey",
    hp: 22,
    maxHp: 22,
    task: null,
    targetId: null,
    progress: 0,
    charge: 0,
  },
];

export const TASK_LABELS = TASKS;

export function createInitialState(): GameState {
  return {
    phase: "ready",
    floor: 1,
    maxFloor: 10,
    mana: 30,
    maxMana: 36,
    aura: 42,
    maxAura: 42,
    gold: 0,
    score: 0,
    selectedHero: "fighter",
    focusedEnemyId: null,
    party: cloneParty(BASE_PARTY),
    enemies: [],
    roomEvent: null,
    floats: [],
    effects: [],
    nextFloatId: 1,
    nextEffectId: 1,
    log: ["The caravan waits at the dungeon stairs."],
    upgrades: {
      attackPower: 0,
      attackSpeed: 0,
      repairPower: 0,
      repairSpeed: 0,
      fighterHp: 0,
      wizardHp: 0,
      bardHp: 0,
      donkeyHp: 0,
      manaRecharge: 0,
      maxMana: 0,
    },
  };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "restart":
      return createInitialState();
    case "start":
      return startRoom(state, 1, true);
    case "select-hero":
      return { ...state, selectedHero: action.heroId };
    case "focus-enemy":
      return { ...state, focusedEnemyId: action.enemyId };
    case "assign":
      return assignTask(state, action.task);
    case "special":
      return resolveSpecial(state, action.heroId);
    case "tick":
      return state.phase === "combat" ? stepCombat(state, action.dt) : ageFloats(state, action.dt);
    case "buy":
      return buyUpgrade(state, action.upgrade);
    case "buy-service":
      return buyShopService(state, action.service);
    case "claim-room":
      return claimRoom(state);
    case "next-floor":
      return startRoom(state, state.floor + 1);
  }
}

function startRoom(state: GameState, floor: number, forceCombat = false): GameState {
  if (floor >= state.maxFloor) return startCombat(state, floor);
  const type = forceCombat ? "combat" : rollRoomType();
  if (type === "story") return startStoryRoom(state, floor);
  if (type === "chest") return startChestRoom(state, floor);
  return startCombat(state, floor);
}

function startCombat(state: GameState, floor: number): GameState {
  const enemies = createEnemies(floor);
  return {
    ...state,
    phase: "combat",
    floor,
    mana: Math.min(state.maxMana, state.mana + 8),
    aura: Math.min(state.maxAura, state.aura + 8),
    selectedHero: state.selectedHero ?? "fighter",
    focusedEnemyId: enemies[0]?.id ?? null,
    roomEvent: null,
    party: state.party.map((hero) => ({
      ...hero,
      hp: Math.min(hero.maxHp, hero.hp + 4),
      task: null,
      targetId: null,
      progress: 0,
    })),
    enemies,
    floats: [],
    effects: [],
    log: [`Floor ${floor}: ${encounterName(floor)} blocks the way.`],
  };
}

function startStoryRoom(state: GameState, floor: number): GameState {
  const reward = Math.max(1, Math.round(battleReward(floor) * STORY_REWARD_MULTIPLIER));
  return startEventRoom(state, floor, {
    type: "story",
    reward,
    ...storyForFloor(floor),
  });
}

function startChestRoom(state: GameState, floor: number): GameState {
  const reward = Math.max(1, Math.round(battleReward(floor) * CHEST_REWARD_MULTIPLIER));
  return startEventRoom(state, floor, {
    type: "chest",
    reward,
    title: "Suspiciously Labeled Chest",
    body: "The label says FREE GOLD, DEFINITELY NOT CURSED. The bard checks the spelling, shrugs, and opens it anyway.",
  });
}

function startEventRoom(state: GameState, floor: number, roomEvent: RoomEvent): GameState {
  return {
    ...state,
    phase: roomEvent.type,
    floor,
    mana: Math.min(state.maxMana, state.mana + 8),
    aura: Math.min(state.maxAura, state.aura + 8),
    focusedEnemyId: null,
    roomEvent,
    enemies: [],
    floats: [],
    effects: [],
    party: state.party.map((hero) => ({
      ...hero,
      hp: Math.min(hero.maxHp, hero.hp + 4),
      task: null,
      targetId: null,
      progress: 0,
    })),
    log: [`Floor ${floor}: ${roomEvent.title}.`],
  };
}

function assignTask(state: GameState, task: Task): GameState {
  if (state.phase !== "combat" || !state.selectedHero) return state;

  const hero = state.party.find((member) => member.id === state.selectedHero);
  if (!hero || hero.hp <= 0) return state;
  if (task === "repair-aura" && state.mana < AURA_REPAIR_COST) {
    return pushLog(state, `Need ${AURA_REPAIR_COST} mana to repair aura.`);
  }

  const targetId = task === "attack" ? livingEnemyId(state, state.focusedEnemyId) : null;

  return {
    ...state,
    party: state.party.map((member) =>
      member.id === hero.id ? { ...member, task, targetId, progress: 0 } : member,
    ),
    log: [`${hero.name} queues ${TASKS[task].label}.`, ...state.log].slice(0, 5),
  };
}

function stepCombat(state: GameState, dt: number): GameState {
  let next = ageFloats(state, dt);
  next = rechargeMana(next, dt);
  next = tickHeroes(next, dt);
  next = tickEnemies(next, dt);
  next = normalizeFocus(next);

  if (next.party.every((hero) => hero.hp <= 0)) {
    return {
      ...next,
      phase: "game-over",
      log: ["The party falls and the caravan goes dark.", ...next.log].slice(0, 5),
    };
  }

  if (next.enemies.every((enemy) => enemy.hp <= 0)) {
    if (isDragonPartsFight(next)) {
      const heart = createDragonHeart();
      return {
        ...next,
        enemies: [heart],
        focusedEnemyId: heart.id,
        floats: [],
        effects: [],
        log: ["The dragon shell cracks. Its heart is exposed.", ...next.log].slice(0, 5),
      };
    }

    const reward = battleReward(next.floor);
    const score = next.score + 100 * next.floor + Math.round(next.aura) + Math.round(next.mana);
    if (next.floor >= next.maxFloor) {
      return {
        ...next,
        phase: "won",
        enemies: [],
        focusedEnemyId: null,
        gold: next.gold + reward,
        score,
        log: ["The final gate opens. The caravan survives.", ...next.log].slice(0, 5),
      };
    }
    return {
      ...next,
      phase: "shop",
      enemies: [],
      focusedEnemyId: null,
      gold: next.gold + reward,
      score,
      log: [`Victory. Looted ${reward} gold.`, ...next.log].slice(0, 5),
    };
  }

  return next;
}

function claimRoom(state: GameState): GameState {
  if (!state.roomEvent || (state.phase !== "story" && state.phase !== "chest")) return state;
  const score = state.score + 70 * state.floor + state.roomEvent.reward;
  if (state.floor >= state.maxFloor) {
    return {
      ...state,
      phase: "won",
      gold: state.gold + state.roomEvent.reward,
      score,
      roomEvent: null,
      log: ["The final gate opens. The caravan survives.", ...state.log].slice(0, 5),
    };
  }
  return {
    ...state,
    phase: "shop",
    gold: state.gold + state.roomEvent.reward,
    score,
    roomEvent: null,
    log: [`Collected ${state.roomEvent.reward} gold.`, ...state.log].slice(0, 5),
  };
}

function tickHeroes(state: GameState, dt: number): GameState {
  let next = state;
  for (const hero of state.party) {
    if (hero.hp <= 0 || !hero.task) continue;
    const progress = hero.progress + dt / taskSeconds(state, hero.task);
    if (progress < 1) {
      next = updateHero(next, hero.id, { progress });
      continue;
    }
    next = resolveTask(next, hero);
  }
  return next;
}

function resolveTask(state: GameState, hero: Hero): GameState {
  if (hero.task === "attack") {
    const heroBonus = hero.id === "fighter" ? 3 : hero.id === "donkey" ? -3 : 0;
    const damage = Math.max(1, 8 + state.upgrades.attackPower * 3 + heroBonus);
    return damageEnemy(
      addEffect(chargeHero(clearHeroTask(state, hero.id), hero.id, 22), attackEffectForHero(hero.id), "enemy", {
        sourceId: hero.id,
        targetId: hero.targetId ?? undefined,
      }),
      hero.targetId,
      damage,
      "hit",
    );
  }

  if (hero.task === "repair-aura") {
    if (state.mana < AURA_REPAIR_COST) {
      return clearHeroTask(pushLog(state, "The aura repair stalls without mana."), hero.id);
    }
    const repairBonus = hero.id === "bard" ? 3 : hero.id === "donkey" ? -4 : 0;
    const repaired = Math.max(1, 13 + state.upgrades.repairPower * 5 + repairBonus);
    return clearHeroTask(
      addEffect(
        chargeHero(
          {
            ...addFloat(state, `+${repaired} aura`, "center"),
            mana: Math.max(0, state.mana - AURA_REPAIR_COST),
            aura: clamp(state.aura + repaired, 0, state.maxAura),
          },
          hero.id,
          18,
        ),
        "repair",
        "party",
        { sourceId: hero.id },
      ),
      hero.id,
    );
  }

  return state;
}

function resolveSpecial(state: GameState, heroId: HeroId): GameState {
  if (state.phase !== "combat") return state;
  const hero = state.party.find((member) => member.id === heroId);
  if (!hero || hero.hp <= 0 || hero.charge < SPECIAL_CHARGE_MAX) return state;

  const resetState = updateHero(clearHeroTask(state, heroId), heroId, { charge: 0 });
  const baseState = addEffect(resetState, "special", "center", { sourceId: heroId });

  if (heroId === "fighter") {
    return damageEnemy(baseState, state.focusedEnemyId, 26 + state.upgrades.attackPower * 4, "shield break");
  }

  if (heroId === "wizard") {
    return damageAllEnemies(baseState, 12 + state.upgrades.attackPower * 2, "chain spark");
  }

  if (heroId === "bard") {
    return slowEnemies(damageAllEnemies(baseState, 7 + state.upgrades.attackPower, "encore"), 0.85);
  }

  return damageEnemy(
    {
      ...addFloat(baseState, "+18 aura / panic kick", "center"),
      aura: clamp(baseState.aura + 18, 0, baseState.maxAura),
    },
    state.focusedEnemyId,
    18,
    "panic kick",
  );
}

function tickEnemies(state: GameState, dt: number): GameState {
  let aura = state.aura;
  let party = state.party;
  let next = state;

  const enemies = state.enemies.map((enemy) => {
    if (enemy.hp <= 0) return enemy;
    const attackTimer = enemy.attackTimer - dt;
    if (attackTimer > 0) return { ...enemy, attackTimer };

    const targetPool = livingParty(party);
    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
    const rawDamage = enemy.damage;
    const auraBlock = Math.min(aura, Math.ceil(rawDamage * 0.85));
    const hpDamage = aura > 0 ? Math.max(1, Math.ceil((rawDamage - auraBlock) * 0.45)) : rawDamage;
    aura = Math.max(0, aura - auraBlock);

    party = party.map((hero) =>
      hero.id === target?.id ? { ...hero, hp: clamp(hero.hp - hpDamage, 0, hero.maxHp) } : hero,
    );
    const attackText = enemy.attackLabel ? `${enemy.attackLabel}: ` : "";
    next = addEffect(
      addFloat(
        next,
        auraBlock > 0
          ? `${attackText}-${auraBlock} aura / -${hpDamage} hp`
          : `${attackText}-${hpDamage} hp`,
        "party",
      ),
      auraBlock > 0 ? "aura-hit" : "slash",
      auraBlock > 0 ? "center" : "party",
    );
    return { ...enemy, attackTimer: enemy.attackEvery };
  });

  return {
    ...next,
    aura,
    party,
    enemies,
  };
}

function rechargeMana(state: GameState, dt: number): GameState {
  const recharge = 2.2 + state.upgrades.manaRecharge * 0.85;
  return {
    ...state,
    mana: clamp(state.mana + dt * recharge, 0, state.maxMana),
  };
}

function buyUpgrade(state: GameState, upgrade: UpgradeId): GameState {
  if (state.phase !== "shop") return state;
  const level = state.upgrades[upgrade];
  const cost = upgradeCost(upgrade, level);
  if (state.gold < cost) return pushLog(state, "Not enough gold.");

  let next: GameState = {
    ...state,
    gold: state.gold - cost,
    upgrades: { ...state.upgrades, [upgrade]: level + 1 },
  };

  if (upgrade === "maxMana") {
    next = {
      ...next,
      maxMana: next.maxMana + 8,
      mana: next.mana + 8,
    };
  }
  if (upgrade === "fighterHp") {
    next = upgradeHeroHp(next, "fighter", 7);
  }
  if (upgrade === "wizardHp") {
    next = upgradeHeroHp(next, "wizard", 6);
  }
  if (upgrade === "bardHp") {
    next = upgradeHeroHp(next, "bard", 6);
  }
  if (upgrade === "donkeyHp") {
    next = upgradeHeroHp(next, "donkey", 5);
  }

  return pushLog(next, `${upgradeLabel(upgrade)} upgraded.`);
}

function buyShopService(state: GameState, service: ShopServiceId): GameState {
  if (state.phase !== "shop") return state;
  const cost = shopServiceCost(service, state.floor);
  if (state.gold < cost) return pushLog(state, "Not enough gold.");

  if (service === "healAll") {
    const hasWounded = state.party.some((hero) => hero.hp > 0 && hero.hp < hero.maxHp);
    if (!hasWounded) return pushLog(state, "Nobody needs healing.");
    return pushLog(
      {
        ...state,
        gold: state.gold - cost,
        party: state.party.map((hero) => (hero.hp > 0 ? { ...hero, hp: hero.maxHp } : hero)),
      },
      "The raid eats, argues, and patches up.",
    );
  }

  const fallen = state.party.find((hero) => hero.hp <= 0);
  if (!fallen) return pushLog(state, "Nobody needs reviving.");
  return pushLog(
    {
      ...state,
      gold: state.gold - cost,
      party: state.party.map((hero) => (hero.id === fallen.id ? { ...hero, hp: hero.maxHp } : hero)),
    },
    `${fallen.name} gets dragged back into formation.`,
  );
}

export function upgradeCost(upgrade: UpgradeId, level: number) {
  const base: Record<UpgradeId, number> = {
    attackPower: 13,
    attackSpeed: 14,
    repairPower: 12,
    repairSpeed: 13,
    fighterHp: 10,
    wizardHp: 10,
    bardHp: 10,
    donkeyHp: 8,
    manaRecharge: 12,
    maxMana: 12,
  };
  return base[upgrade] + level * 8;
}

export function shopServiceCost(service: ShopServiceId, floor: number) {
  if (service === "healAll") return 10 + floor * 2;
  return 18 + floor * 3;
}

function battleReward(floor: number) {
  return BASE_GOLD_REWARD + floor * GOLD_PER_FLOOR;
}

function rollRoomType(): RoomType {
  const roll = Math.random();
  if (roll < 0.05) return "chest";
  if (roll < 0.15) return "story";
  return "combat";
}

function storyForFloor(floor: number) {
  const stories = [
    {
      title: "Mushroom Negotiations",
      body: "A glowing mushroom demands a toll of one sincere compliment. The fighter calls it damp but resilient. Somehow, this works.",
    },
    {
      title: "Lost Dungeon Intern",
      body: "A nervous skeleton asks where onboarding is. The wizard points vaguely downward and invoices the dungeon for consulting.",
    },
    {
      title: "The Echo With Notes",
      body: "Every shout comes back with constructive criticism. The bard argues with it for seven minutes and loses on phrasing.",
    },
    {
      title: "Tiny Door, Big Claims",
      body: "A knee-high door claims to be the grand entrance. Nobody fits, but a polite knock drops a pouch of apology coins.",
    },
    {
      title: "Suspicious Break Room",
      body: "The party finds a table, three mugs, and a sign reading MONSTERS ONLY. They leave before HR notices.",
    },
  ];
  return stories[(floor - 1) % stories.length];
}

function upgradeHeroHp(state: GameState, heroId: HeroId, amount: number): GameState {
  return {
    ...state,
    party: state.party.map((hero) =>
      hero.id === heroId
        ? { ...hero, maxHp: hero.maxHp + amount, hp: hero.hp + amount }
        : hero,
    ),
  };
}

function taskSeconds(state: GameState, task: Task) {
  if (task === "attack") return Math.max(0.45, TASKS.attack.seconds - state.upgrades.attackSpeed * 0.08);
  return Math.max(0.55, TASKS["repair-aura"].seconds - state.upgrades.repairSpeed * 0.09);
}

function createEnemies(floor: number): Enemy[] {
  if (floor >= 10) return createDragonParts();

  const count = floor >= 9 ? 4 : floor >= 5 ? 3 : 2;
  const names = ["Skeleton", "Goblin", "Hex Rat", "Bone Guard"];
  const sprites = [8, 11, 6, 4];
  return Array.from({ length: count }, (_, index) => {
    const hp = Math.round(15 + floor * 3.35 + index * 2.5);
    return {
      id: `enemy-${floor}-${index}`,
      name: names[(floor + index) % names.length],
      sprite: sprites[(floor + index) % sprites.length],
      hp,
      maxHp: hp,
      damage: 3 + Math.ceil(floor * 0.68) + index,
      attackEvery: Math.max(1.65, 2.9 - floor * 0.04 + index * 0.2),
      attackTimer: 1.2 + index * 0.75,
    };
  });
}

function createDragonParts(): Enemy[] {
  return [
    {
      id: "dragon-head",
      name: "Dragon Head",
      sprite: 0,
      bossPart: "head",
      attackLabel: "Fire Breath",
      hp: 92,
      maxHp: 92,
      damage: 18,
      attackEvery: 4.8,
      attackTimer: 2.3,
    },
    {
      id: "dragon-left-claw",
      name: "Left Claw",
      sprite: 0,
      bossPart: "left-claw",
      attackLabel: "Left Swipe",
      hp: 54,
      maxHp: 54,
      damage: 9,
      attackEvery: 2.7,
      attackTimer: 1.1,
    },
    {
      id: "dragon-right-claw",
      name: "Right Claw",
      sprite: 0,
      bossPart: "right-claw",
      attackLabel: "Right Swipe",
      hp: 54,
      maxHp: 54,
      damage: 10,
      attackEvery: 3,
      attackTimer: 1.7,
    },
    {
      id: "dragon-wings",
      name: "Wings",
      sprite: 0,
      bossPart: "wings",
      attackLabel: "Wing Burst",
      hp: 66,
      maxHp: 66,
      damage: 12,
      attackEvery: 5.4,
      attackTimer: 3.2,
    },
  ];
}

function createDragonHeart(): Enemy {
  return {
    id: "dragon-heart",
    name: "Dragon Heart",
    sprite: 0,
    bossPart: "heart",
    attackLabel: "Heartflare",
    hp: 84,
    maxHp: 84,
    damage: 14,
    attackEvery: 3.8,
    attackTimer: 1.4,
  };
}

function isDragonPartsFight(state: GameState) {
  return state.enemies.some((enemy) => enemy.bossPart && enemy.bossPart !== "heart");
}

function damageEnemy(state: GameState, targetId: string | null, damage: number, text: string): GameState {
  const id = livingEnemyId(state, targetId);
  if (!id) return state;
  return {
    ...addFloat(state, `${text} -${damage}`, "enemy"),
    enemies: state.enemies.map((enemy) =>
      enemy.id === id ? { ...enemy, hp: clamp(enemy.hp - damage, 0, enemy.maxHp) } : enemy,
    ),
  };
}

function damageAllEnemies(state: GameState, damage: number, text: string): GameState {
  return {
    ...addFloat(state, `${text} -${damage}`, "enemy"),
    enemies: state.enemies.map((enemy) =>
      enemy.hp > 0 ? { ...enemy, hp: clamp(enemy.hp - damage, 0, enemy.maxHp) } : enemy,
    ),
  };
}

function slowEnemies(state: GameState, seconds: number): GameState {
  return {
    ...addFloat(state, `+${seconds.toFixed(1)}s enemy delay`, "enemy"),
    enemies: state.enemies.map((enemy) =>
      enemy.hp > 0 ? { ...enemy, attackTimer: Math.min(enemy.attackEvery, enemy.attackTimer + seconds) } : enemy,
    ),
  };
}

function normalizeFocus(state: GameState): GameState {
  const focusedEnemyId = livingEnemyId(state, state.focusedEnemyId);
  return focusedEnemyId === state.focusedEnemyId ? state : { ...state, focusedEnemyId };
}

function livingEnemyId(state: GameState, preferredId: string | null) {
  const preferred = state.enemies.find((enemy) => enemy.id === preferredId && enemy.hp > 0);
  return preferred?.id ?? firstLivingEnemy(state.enemies)?.id ?? null;
}

function clearHeroTask(state: GameState, heroId: HeroId): GameState {
  return updateHero(state, heroId, {
    task: null,
    targetId: null,
    progress: 0,
  });
}

function updateHero(state: GameState, heroId: HeroId, patch: Partial<Hero>): GameState {
  return {
    ...state,
    party: state.party.map((hero) => (hero.id === heroId ? { ...hero, ...patch } : hero)),
  };
}

function chargeHero(state: GameState, heroId: HeroId, amount: number): GameState {
  return updateHero(state, heroId, {
    charge: Math.min(SPECIAL_CHARGE_MAX, (state.party.find((hero) => hero.id === heroId)?.charge ?? 0) + amount),
  });
}

function ageFloats(state: GameState, dt: number): GameState {
  return {
    ...state,
    floats: state.floats
      .map((float) => ({ ...float, ttl: float.ttl - dt }))
      .filter((float) => float.ttl > 0),
    effects: state.effects
      .map((effect) => ({ ...effect, ttl: effect.ttl - dt }))
      .filter((effect) => effect.ttl > 0),
  };
}

function addFloat(state: GameState, text: string, side: FloatText["side"]): GameState {
  return {
    ...state,
    floats: [{ id: state.nextFloatId, text, side, ttl: 0.9 }, ...state.floats].slice(0, 6),
    nextFloatId: state.nextFloatId + 1,
  };
}

function pushLog(state: GameState, line: string): GameState {
  return { ...state, log: [line, ...state.log].slice(0, 5) };
}

function addEffect(
  state: GameState,
  kind: CombatEffect["kind"],
  side: CombatEffect["side"],
  options: Pick<CombatEffect, "sourceId" | "targetId"> = {},
): GameState {
  return {
    ...state,
    effects: [{ id: state.nextEffectId, kind, side, ttl: 0.65, ...options }, ...state.effects].slice(0, 8),
    nextEffectId: state.nextEffectId + 1,
  };
}

function attackEffectForHero(heroId: HeroId): CombatEffect["kind"] {
  if (heroId === "fighter") return "slash";
  if (heroId === "wizard") return "spark";
  if (heroId === "bard") return "music";
  return "kick";
}

export function specialForHero(heroId: HeroId): { id: SpecialId; label: string } {
  if (heroId === "fighter") return { id: "shieldBreaker", label: "Shield Breaker" };
  if (heroId === "wizard") return { id: "chainSpark", label: "Chain Spark" };
  if (heroId === "bard") return { id: "purpleEncore", label: "Purple Encore" };
  return { id: "panicKick", label: "Panic Kick" };
}

function firstLivingEnemy(enemies: Enemy[]) {
  return enemies.find((enemy) => enemy.hp > 0);
}

function livingParty(party: Hero[]) {
  return party.filter((hero) => hero.hp > 0);
}

function cloneParty(party: Hero[]) {
  return party.map((hero) => ({ ...hero }));
}

function encounterName(floor: number) {
  if (floor >= 10) return "The Toll Dragon";
  const names = ["Bone Toll", "Mold Shrine", "Rust Hall", "Candle Pit", "Last Stair"];
  return names[(floor - 1) % names.length];
}

function upgradeLabel(upgrade: UpgradeId) {
  return {
    attackPower: "Attack Power",
    attackSpeed: "Attack Speed",
    repairPower: "Repair Power",
    repairSpeed: "Repair Speed",
    fighterHp: "Fighter HP",
    wizardHp: "Wizard HP",
    bardHp: "Bard HP",
    donkeyHp: "Donkey HP",
    manaRecharge: "Mana Recharge",
    maxMana: "Max Mana",
  }[upgrade];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
