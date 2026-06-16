"use client";

import { type CSSProperties, useEffect, useReducer, useRef, useState } from "react";
import {
  SPECIAL_CHARGE_MAX,
  TASK_LABELS,
  createInitialState,
  reducer,
  shopServiceCost,
  specialForHero,
  upgradeCost,
  type CombatEffect,
  type Enemy,
  type GameState,
  type HeroId,
  type Hero,
  type RoomEvent,
  type ShopServiceId,
  type Task,
  type UpgradeId,
} from "@/game/caravan";

const TASKS: Task[] = ["attack", "repair-aura"];
const HERO_HOTKEYS: Record<string, HeroId> = {
  "1": "fighter",
  "2": "wizard",
  "3": "bard",
  "4": "donkey",
};
const HERO_HOTKEY_LABELS: Record<HeroId, string> = {
  fighter: "1",
  wizard: "2",
  bard: "3",
  donkey: "4",
};
const TASK_HOTKEY_LABELS: Record<Task, string> = {
  attack: "A",
  "repair-aura": "R",
};
const SPECIAL_HOTKEY_LABEL = "S";
const SHOP_SERVICES: { id: ShopServiceId; label: string; note: string }[] = [
  { id: "healAll", label: "Full Heal", note: "Restore all living raiders to full HP" },
  { id: "reviveOne", label: "Revive Raider", note: "Bring one fallen raider back at full HP" },
];

const SHOP_GROUPS: {
  title: string;
  options: { id: UpgradeId; label: string; note: string }[];
}[] = [
  {
    title: "Group Stats",
    options: [
      { id: "attackPower", label: "Attack Power", note: "More damage per hit" },
      { id: "attackSpeed", label: "Attack Speed", note: "Shorter attack timer" },
      { id: "repairPower", label: "Repair Power", note: "More aura restored" },
      { id: "repairSpeed", label: "Repair Speed", note: "Shorter repair timer" },
      { id: "manaRecharge", label: "Mana Recharge", note: "Faster passive mana" },
      { id: "maxMana", label: "Max Mana", note: "Larger mana battery" },
    ],
  },
  {
    title: "Individual Stats",
    options: [
      { id: "fighterHp", label: "Fighter HP", note: "Raise Fighter max HP" },
      { id: "wizardHp", label: "Wizard HP", note: "Raise Wizard max HP" },
      { id: "bardHp", label: "Bard HP", note: "Raise Bard max HP" },
      { id: "donkeyHp", label: "Donkey HP", note: "Raise Donkey max HP" },
    ],
  },
];

type Screen = "title" | "kickoff" | "playing" | "recap";
type RunResult = "won" | "game-over";

interface PlayerSession {
  authenticated: boolean;
  handle: string;
}

interface ScoreRow {
  createdAt: string;
  durationMs: number;
  floor: number;
  gold: number;
  handle: string;
  id: number;
  result: RunResult;
  score: number;
}

interface Leaderboard {
  personalBest: ScoreRow | null;
  top: ScoreRow[];
}

interface RunSummary {
  durationMs: number;
  floor: number;
  gold: number;
  result: RunResult;
  score: number;
}

interface SpecialCinematic {
  heroId: HeroId;
  heroName: string;
  label: string;
}

export default function CaravanGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [screen, setScreen] = useState<Screen>("title");
  const [combatIntro, setCombatIntro] = useState<{ floor: number; label: string } | null>(null);
  const [specialCinematic, setSpecialCinematic] = useState<SpecialCinematic | null>(null);
  const [session, setSession] = useState<PlayerSession>({ authenticated: false, handle: "Stranger" });
  const [leaderboard, setLeaderboard] = useState<Leaderboard>({ personalBest: null, top: [] });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const runStartedAt = useRef(0);
  const submittedRun = useRef(false);
  const combatIntroActive = combatIntro !== null;
  const combatIntroActiveRef = useRef(false);
  const specialActiveRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (combatIntroActiveRef.current) return;
      if (specialActiveRef.current) return;
      dispatch({ type: "tick", dt: 1 / 12 });
    }, 1000 / 12);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void refreshShellData();
  }, []);

  useEffect(() => {
    if (screen !== "playing" || state.phase !== "combat") {
      combatIntroActiveRef.current = false;
      specialActiveRef.current = false;
      setCombatIntro(null);
      setSpecialCinematic(null);
      return;
    }

    combatIntroActiveRef.current = true;
    setCombatIntro({ floor: state.floor, label: "5" });

    const timers = [
      window.setTimeout(() => setCombatIntro({ floor: state.floor, label: "4" }), 900),
      window.setTimeout(() => setCombatIntro({ floor: state.floor, label: "3" }), 1800),
      window.setTimeout(() => setCombatIntro({ floor: state.floor, label: "2" }), 2700),
      window.setTimeout(() => setCombatIntro({ floor: state.floor, label: "1" }), 3600),
      window.setTimeout(() => setCombatIntro({ floor: state.floor, label: "Go" }), 4500),
      window.setTimeout(() => {
        combatIntroActiveRef.current = false;
        setCombatIntro(null);
      }, 5000),
    ];

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [screen, state.phase, state.floor]);

  useEffect(() => {
    if (screen !== "playing" || (state.phase !== "game-over" && state.phase !== "won")) return;
    if (submittedRun.current) return;

    submittedRun.current = true;
    const runSummary: RunSummary = {
      durationMs: Math.max(0, Date.now() - runStartedAt.current),
      floor: state.floor,
      gold: state.gold,
      result: state.phase,
      score: state.score,
    };
    setSummary(runSummary);
    setScreen("recap");
    void submitScore(runSummary);
  }, [screen, state.phase, state.floor, state.gold, state.score]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (screen !== "playing" || state.phase !== "combat") return;
      if (combatIntroActiveRef.current) return;
      if (specialActiveRef.current) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (event.shiftKey && /^[1-4]$/.test(key)) {
        const enemy = state.enemies.filter((target) => target.hp > 0)[Number(key) - 1];
        if (enemy) {
          event.preventDefault();
          dispatch({ type: "focus-enemy", enemyId: enemy.id });
        }
        return;
      }

      const heroId = HERO_HOTKEYS[key];
      if (heroId) {
        event.preventDefault();
        dispatch({ type: "select-hero", heroId });
        return;
      }

      if (key === "a") {
        event.preventDefault();
        dispatch({ type: "assign", task: "attack" });
        return;
      }

      if (key === "r") {
        event.preventDefault();
        dispatch({ type: "assign", task: "repair-aura" });
        return;
      }

      if (key === "s") {
        const hero = state.party.find((member) => member.id === state.selectedHero);
        if (hero) {
          event.preventDefault();
          triggerSpecial(hero);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen, state.phase, state.enemies, state.party, state.selectedHero]);

  const triggerSpecial = (hero: Hero) => {
    if (hero.hp <= 0 || hero.charge < SPECIAL_CHARGE_MAX || specialActiveRef.current || combatIntroActiveRef.current) {
      return;
    }

    specialActiveRef.current = true;
    setSpecialCinematic({
      heroId: hero.id,
      heroName: hero.name,
      label: specialForHero(hero.id).label,
    });

    window.setTimeout(() => {
      dispatch({ type: "special", heroId: hero.id });
    }, 620);

    window.setTimeout(() => {
      specialActiveRef.current = false;
      setSpecialCinematic(null);
    }, 920);
  };

  const refreshShellData = async () => {
    const [sessionRes, scoreRes] = await Promise.all([
      fetch("/api/session").catch(() => null),
      fetch("/api/scores").catch(() => null),
    ]);
    if (sessionRes?.ok) setSession((await sessionRes.json()) as PlayerSession);
    if (scoreRes?.ok) setLeaderboard((await scoreRes.json()) as Leaderboard);
  };

  const submitScore = async (runSummary: RunSummary) => {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(runSummary),
    }).catch(() => null);
    if (res?.ok) {
      const nextBoard = (await res.json()) as Leaderboard;
      setLeaderboard(nextBoard);
    } else {
      void refreshShellData();
    }
  };

  const beginRun = () => {
    submittedRun.current = false;
    setSummary(null);
    runStartedAt.current = Date.now();
    dispatch({ type: "restart" });
    dispatch({ type: "start" });
    setScreen("playing");
  };

  if (screen === "title") {
    return (
      <TitleScreen
        leaderboard={leaderboard}
        onStart={() => setScreen("kickoff")}
        session={session}
      />
    );
  }

  if (screen === "kickoff") {
    return <KickoffScreen onBack={() => setScreen("title")} onStart={beginRun} session={session} />;
  }

  if (screen === "recap" && summary) {
    return (
      <RecapScreen
        leaderboard={leaderboard}
        onTitle={() => {
          dispatch({ type: "restart" });
          setScreen("title");
          void refreshShellData();
        }}
        summary={summary}
        session={session}
      />
    );
  }

  return (
    <main className="game-shell">
      <TopBar state={state} />
      <section className="battlefield" data-phase={state.phase}>
        <PartyPanel state={state} dispatch={dispatch} />
        <CenterStage
          state={state}
          dispatch={dispatch}
          combatIntro={combatIntro}
          combatIntroActive={combatIntroActive}
          onSpecial={triggerSpecial}
          specialCinematic={specialCinematic}
        />
        <EnemyPanel state={state} dispatch={dispatch} />
      </section>
      <LogPanel lines={state.log} />
    </main>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function TitleScreen({
  leaderboard,
  onStart,
  session,
}: {
  leaderboard: Leaderboard;
  onStart: () => void;
  session: PlayerSession;
}) {
  return (
    <main className="title-shell">
      <section className="title-hero">
        <div className="title-art" aria-hidden="true" />
        <p className="title-kicker">A real-time caravan roguelite</p>
        <h1 className="sr-only">Fantasy Trail Legends</h1>
        <p className="title-copy">
          Guide a tiny raid through ten cursed rooms. Patch the aura, pick targets, loot what survives.
        </p>
        <button className="primary-command title-start" onClick={onStart}>
          Start Run
        </button>
        <p className="title-session">
          {session.authenticated ? `Ranked as ${session.handle}` : "Anonymous practice run - launch from the Portal to rank"}
        </p>
      </section>
      <LeaderboardPanel leaderboard={leaderboard} />
    </main>
  );
}

function KickoffScreen({
  onBack,
  onStart,
  session,
}: {
  onBack: () => void;
  onStart: () => void;
  session: PlayerSession;
}) {
  return (
    <main className="title-shell kickoff-shell">
      <section className="kickoff-panel">
        <p className="title-kicker">Trail briefing</p>
        <h1>Fantasy Trail Legends</h1>
        <div className="kickoff-grid">
          <div>
            <h2>Run Plan</h2>
            <p>Clear ten rooms, visit the armory after each room, and keep at least one raider standing.</p>
          </div>
          <div>
            <h2>Controls</h2>
            <p>Select a raider, choose Attack or Repair Aura, and focus enemies from the dungeon panel. Desktop: 1-4, A/R, Shift+1-4.</p>
          </div>
          <div>
            <h2>Scoring</h2>
            <p>Score comes from room progress, remaining gold, aura, mana, and whether the caravan survives.</p>
          </div>
        </div>
        <p className="title-session">
          {session.authenticated ? `Portal launch verified for ${session.handle}` : "Playing unranked as Stranger"}
        </p>
        <div className="kickoff-actions">
          <button className="secondary-command" onClick={onBack}>Back</button>
          <button className="primary-command" onClick={onStart}>Enter the Trail</button>
        </div>
      </section>
    </main>
  );
}

function RecapScreen({
  leaderboard,
  onTitle,
  session,
  summary,
}: {
  leaderboard: Leaderboard;
  onTitle: () => void;
  session: PlayerSession;
  summary: RunSummary;
}) {
  return (
    <main className="title-shell recap-shell" data-result={summary.result}>
      <section className="recap-panel">
        <p className="title-kicker">{summary.result === "won" ? "Trail cleared" : "Run ended"}</p>
        <h1>{summary.result === "won" ? "Caravan Clear" : "Perma Death"}</h1>
        <div className="recap-stats">
          <strong>Score {summary.score}</strong>
          <span>Floor {summary.floor}</span>
          <span>Gold {summary.gold}</span>
          <span>{formatDuration(summary.durationMs)}</span>
        </div>
        <p className="title-session">
          {session.authenticated ? `Score submitted for ${session.handle}` : "Unranked run - launch from the Portal to submit scores"}
        </p>
        <button className="primary-command" onClick={onTitle}>Back to Title</button>
      </section>
      <LeaderboardPanel leaderboard={leaderboard} />
    </main>
  );
}

function LeaderboardPanel({ leaderboard }: { leaderboard: Leaderboard }) {
  return (
    <aside className="leaderboard-panel">
      <h2>Leaderboard</h2>
      {leaderboard.top.length === 0 ? (
        <p className="panel-note">No ranked scores yet.</p>
      ) : (
        <ol>
          {leaderboard.top.map((row) => (
            <li key={row.id}>
              <strong>{row.handle}</strong>
              <span>{row.score}</span>
            </li>
          ))}
        </ol>
      )}
      {leaderboard.personalBest && (
        <p className="personal-best">Your best: {leaderboard.personalBest.score}</p>
      )}
    </aside>
  );
}

function formatDuration(durationMs: number) {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function TopBar({ state }: { state: GameState }) {
  return (
    <header className="top-bar">
      <strong>Aura {Math.ceil(state.aura)}/{state.maxAura}</strong>
      <span>Mana {Math.floor(state.mana)}/{state.maxMana}</span>
      <span>Floor {state.floor}/{state.maxFloor}</span>
      <span>Gold {state.gold}</span>
      <span>Score {state.score}</span>
    </header>
  );
}

function PartyPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
}) {
  return (
    <aside className="panel party-panel">
      <h2>Caravan</h2>
      <div className="unit-list">
        {state.party.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={state.selectedHero === hero.id}
            onSelect={() => dispatch({ type: "select-hero", heroId: hero.id })}
          />
        ))}
      </div>
    </aside>
  );
}

function HeroCard({
  hero,
  selected,
  onSelect,
}: {
  hero: Hero;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className="unit-card" data-selected={selected} data-down={hero.hp <= 0} onClick={onSelect}>
      <Sprite index={heroSpriteIndex(hero)} sheet={hero.spriteSheet} />
      <span className="unit-main">
        <span className="unit-title">
          <strong>{hero.name}</strong>
          <span className="unit-meta">
            <small>{hero.role}</small>
            <kbd className="key-hint">({HERO_HOTKEY_LABELS[hero.id]})</kbd>
          </span>
        </span>
        <Meter label="HP" value={hero.hp} max={hero.maxHp} tone="red" />
        <Meter label="SP" value={hero.charge} max={SPECIAL_CHARGE_MAX} tone="gold" />
        <TaskQueue task={hero.task} progress={hero.progress} />
      </span>
    </button>
  );
}

function EnemyPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
}) {
  if (state.phase === "shop" || state.phase === "story" || state.phase === "chest") {
    return (
      <aside className="panel enemy-panel">
        <h2>{state.phase === "shop" ? "Armory" : "Quiet Room"}</h2>
        <p className="panel-note">
          {state.phase === "shop"
            ? "No monsters in the shop. Spend gold, then enter the next dungeon."
            : "No combat here. Claim the room reward, then upgrade before moving on."}
        </p>
      </aside>
    );
  }

  return (
    <aside className="panel enemy-panel">
      <h2>Dungeon</h2>
      <div className="unit-list">
        {state.enemies.map((enemy) => (
          <EnemyCard
            key={enemy.id}
            enemy={enemy}
            focused={state.focusedEnemyId === enemy.id}
            onFocus={() => dispatch({ type: "focus-enemy", enemyId: enemy.id })}
          />
        ))}
      </div>
    </aside>
  );
}

function EnemyCard({
  enemy,
  focused,
  onFocus,
}: {
  enemy: Enemy;
  focused: boolean;
  onFocus: () => void;
}) {
  return (
    <button className="unit-card enemy-card" data-selected={focused} data-down={enemy.hp <= 0} onClick={onFocus}>
      <span className="unit-main">
        <span className="unit-title">
          <strong>{enemy.name}</strong>
          <small>{enemy.hp <= 0 ? "Banished" : "Auto-attacks"}</small>
        </span>
        <Meter label="HP" value={enemy.hp} max={enemy.maxHp} tone="red" />
        <Meter label="Next" value={enemy.attackEvery - enemy.attackTimer} max={enemy.attackEvery} tone="violet" />
      </span>
      <Sprite index={enemy.sprite} flip />
    </button>
  );
}

function CenterStage({
  state,
  dispatch,
  combatIntro,
  combatIntroActive,
  onSpecial,
  specialCinematic,
}: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
  combatIntro: { floor: number; label: string } | null;
  combatIntroActive: boolean;
  onSpecial: (hero: Hero) => void;
  specialCinematic: SpecialCinematic | null;
}) {
  const selected = state.party.find((hero) => hero.id === state.selectedHero);
  const specialReady = selected ? selected.hp > 0 && selected.charge >= SPECIAL_CHARGE_MAX : false;
  if (state.phase === "story" || state.phase === "chest") {
    return (
      <section className="center-stage center-stage--shop">
        <RouteMap state={state} />
        <EventRoom event={state.roomEvent} dispatch={dispatch} />
      </section>
    );
  }

  if (state.phase === "shop") {
    return (
      <section className="center-stage center-stage--shop">
        <RouteMap state={state} />
        <Shop state={state} dispatch={dispatch} />
      </section>
    );
  }

  return (
    <section className="center-stage">
      <div className="dungeon-lane" data-intro={combatIntroActive}>
        <div className="battle-status">
          <RouteMap state={state} />
          <div className="resource-bank">
            <Meter label="Aura" value={state.aura} max={state.maxAura} tone="blue" />
            <Meter label="Mana" value={state.mana} max={state.maxMana} tone="violet" />
          </div>
        </div>
        <div className="party-line" data-intro={combatIntroActive}>
          {state.party.map((hero) => (
            <div className="standing-unit" key={hero.id} data-down={hero.hp <= 0} data-task={hero.task ?? "idle"}>
              <Sprite index={heroSpriteIndex(hero)} sheet={hero.spriteSheet} />
              <TaskQueue task={hero.task} progress={hero.progress} compact />
            </div>
          ))}
        </div>
        <div className="float-layer">
          {state.floats.map((float) => (
            <span key={float.id} className={`float-text float-${float.side}`}>
              {float.text}
            </span>
          ))}
        </div>
        <EffectLayer effects={state.effects} state={state} />
        {combatIntro && <CombatIntro floor={combatIntro.floor} label={combatIntro.label} />}
        {specialCinematic && <SpecialOverlay cinematic={specialCinematic} />}
        <div className="enemy-line" data-intro={combatIntroActive}>
          {state.enemies.map((enemy) => (
            <button
              className="standing-unit standing-unit--enemy"
              data-down={enemy.hp <= 0}
              data-selected={state.focusedEnemyId === enemy.id}
              key={enemy.id}
              onClick={() => dispatch({ type: "focus-enemy", enemyId: enemy.id })}
            >
              <Sprite index={enemy.sprite} flip />
              <span className="standing-label">{enemy.name}</span>
            </button>
          ))}
        </div>
      </div>

      {state.phase === "ready" && (
        <div className="command-strip">
          <button className="primary-command" onClick={() => dispatch({ type: "start" })}>
            Tap to Advance
          </button>
        </div>
      )}

      {state.phase === "combat" && (
        <div className="command-strip">
          <div className="selected-readout">
            {combatIntroActive
              ? `Floor ${state.floor}: get ready`
              : `${selected ? `${selected.name} selected` : "Pick a hero"} · A Attack · R Repair · Shift+1-4 target`}
          </div>
          <div className="task-grid">
            {TASKS.map((task) => (
              <button disabled={combatIntroActive} key={task} onClick={() => dispatch({ type: "assign", task })}>
                <span>{TASK_LABELS[task].label}</span>
                <kbd className="key-hint">({TASK_HOTKEY_LABELS[task]})</kbd>
              </button>
            ))}
            <button
              className="special-command"
              disabled={combatIntroActive || !selected || !specialReady}
              onClick={() => selected && onSpecial(selected)}
            >
              <span>{selected ? specialForHero(selected.id).label : "Special"}</span>
              <kbd className="key-hint">({SPECIAL_HOTKEY_LABEL})</kbd>
            </button>
          </div>
        </div>
      )}
      {(state.phase === "game-over" || state.phase === "won") && (
        <div className="end-panel">
          <h1>{state.phase === "won" ? "Caravan Clear" : "Perma Death"}</h1>
          <p>Score {state.score}</p>
          <button className="primary-command" onClick={() => dispatch({ type: "restart" })}>
            New Run
          </button>
        </div>
      )}
    </section>
  );
}

function SpecialOverlay({ cinematic }: { cinematic: SpecialCinematic }) {
  return (
    <div className="special-overlay" data-hero={cinematic.heroId} aria-live="polite">
      <span>{cinematic.heroName}</span>
      <strong>{cinematic.label}</strong>
    </div>
  );
}

function CombatIntro({ floor, label }: { floor: number; label: string }) {
  return (
    <div className="combat-intro" aria-live="polite">
      <span>Floor {floor}</span>
      <strong>{label}</strong>
    </div>
  );
}

function EffectLayer({ effects, state }: { effects: CombatEffect[]; state: GameState }) {
  if (effects.length === 0) return null;
  return (
    <div className="effect-layer" aria-hidden="true">
      {effects.map((effect) => (
        <span
          className={`combat-effect combat-effect--${effect.kind} combat-effect--${effect.side}`}
          key={effect.id}
          style={{ "--slot": effectSlot(effect, state) } as CSSProperties}
        />
      ))}
    </div>
  );
}

function effectSlot(effect: CombatEffect, state: GameState) {
  if (effect.side === "enemy") {
    const targetIndex = state.enemies.findIndex((enemy) => enemy.id === effect.targetId);
    return Math.max(0, targetIndex);
  }
  if (effect.side === "party") {
    const sourceIndex = state.party.findIndex((hero) => hero.id === effect.sourceId);
    return Math.max(0, sourceIndex);
  }
  return 0;
}

function EventRoom({
  event,
  dispatch,
}: {
  event: RoomEvent | null;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
}) {
  if (!event) return null;
  return (
    <div className="event-room" data-type={event.type}>
      <span className="event-kicker">{event.type === "chest" ? "Chest Room" : "Story Room"}</span>
      <h1>{event.title}</h1>
      <p>{event.body}</p>
      <div className="event-reward">{event.reward} gold</div>
      <button className="primary-command" onClick={() => dispatch({ type: "claim-room" })}>
        {event.type === "chest" ? "Take Loot" : "Continue"}
      </button>
    </div>
  );
}

function RouteMap({ state }: { state: GameState }) {
  return (
    <div className="route-map" aria-label={`Dungeon route, current room ${state.floor} of ${state.maxFloor}`}>
      {Array.from({ length: state.maxFloor }, (_, index) => {
        const room = index + 1;
        const isCurrent = room === state.floor;
        const isCleared = room < state.floor || state.phase === "won";
        const isNext = state.phase === "shop" && room === state.floor + 1;
        return (
          <span
            className="route-node"
            data-current={isCurrent}
            data-cleared={isCleared}
            data-next={isNext}
            key={room}
          >
            {room}
          </span>
        );
      })}
    </div>
  );
}

function Shop({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reducer>[1]>;
}) {
  return (
    <div className="shop">
      <h1>Armory</h1>
      <p className="shop-summary">Gold {state.gold} · choose upgrades before Floor {state.floor + 1}</p>
      <div className="shop-sections">
        <section className="shop-section">
          <h2>Recovery</h2>
          <div className="shop-grid">
            {SHOP_SERVICES.map((service) => {
              const cost = shopServiceCost(service.id, state.floor);
              const available = shopServiceAvailable(state, service.id);
              return (
                <ShopButton
                  key={service.id}
                  label={service.label}
                  note={service.note}
                  value={null}
                  cost={cost}
                  affordable={state.gold >= cost}
                  available={available}
                  onClick={() => dispatch({ type: "buy-service", service: service.id })}
                />
              );
            })}
          </div>
        </section>
        {SHOP_GROUPS.map((group) => (
          <section className="shop-section" key={group.title}>
            <h2>{group.title}</h2>
            <div className="shop-grid">
              {group.options.map((option) => {
                const value = state.upgrades[option.id];
                const cost = upgradeCost(option.id, value);
                return (
                  <ShopButton
                    key={option.id}
                    label={option.label}
                    note={option.note}
                    value={value}
                    cost={cost}
                    affordable={state.gold >= cost}
                    onClick={() => dispatch({ type: "buy", upgrade: option.id })}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <button className="primary-command" onClick={() => dispatch({ type: "next-floor" })}>
        Enter Next Dungeon
      </button>
    </div>
  );
}

function ShopButton({
  label,
  note,
  value,
  cost,
  affordable,
  available = true,
  onClick,
}: {
  label: string;
  note: string;
  value: number | null;
  cost: number;
  affordable: boolean;
  available?: boolean;
  onClick: () => void;
}) {
  const disabled = !available || !affordable;
  return (
    <button className="shop-button" disabled={disabled} onClick={onClick}>
      <strong>{label}</strong>
      <small>{note}</small>
      <span>
        {value === null ? "" : `Lv ${value} · `}
        {cost}g{!available ? " · not needed" : affordable ? "" : " · need more"}
      </span>
    </button>
  );
}

function shopServiceAvailable(state: GameState, service: ShopServiceId) {
  if (service === "healAll") return state.party.some((hero) => hero.hp > 0 && hero.hp < hero.maxHp);
  return state.party.some((hero) => hero.hp <= 0);
}

function Meter({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span className="meter" data-tone={tone}>
      <span className="meter-label">{label}</span>
      <span className="meter-track">
        <span style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

function TaskQueue({ task, progress, compact = false }: { task: Task | null; progress: number; compact?: boolean }) {
  return (
    <span className="queue" data-empty={!task} data-compact={compact}>
      <span>{task ? TASK_LABELS[task].label : compact ? "Idle" : "No task"}</span>
      <span className="queue-track">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </span>
    </span>
  );
}

function heroSpriteIndex(hero: Hero) {
  if (hero.spriteSheet !== "donkey") return hero.sprite;
  if (hero.hp <= 0) return 3;
  if (hero.task === "attack") return 1;
  if (hero.task === "repair-aura") return 2;
  return 0;
}

function Sprite({
  index,
  flip = false,
  sheet = "characters",
}: {
  index: number;
  flip?: boolean;
  sheet?: Hero["spriteSheet"];
}) {
  return (
    <span
      className={`sprite sprite--${sheet ?? "characters"}`}
      style={
        {
          "--sprite-index": index,
          transform: flip ? "scaleX(-1)" : undefined,
        } as CSSProperties
      }
    />
  );
}

function LogPanel({ lines }: { lines: string[] }) {
  return (
    <footer className="event-log">
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>{line}</span>
      ))}
    </footer>
  );
}
