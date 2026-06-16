# Fantasy Trail Legends Steering Spec

## North Star

Fantasy Trail Legends is a small, funny, real-time roguelite caravan RPG. The player guides a raid party through a 10-node dungeon trail, assigning raiders to simple timed actions while shared resources and individual HP are pressured by encounters.

The game should feel like a lightweight FTL-inspired multitasking RPG without pathfinding, room navigation, inventory management, or large tactical menus.

## Current Core Loop

1. Start a run.
2. Enter node 1 of 10.
3. Resolve the room:
   - Combat: assign raiders to Attack or Repair Aura.
   - Story: read a short funny beat, collect partial gold.
   - Chest: reveal bonus gold.
4. Visit the shop.
5. Spend gold on upgrades or save it.
6. Continue to the next node.
7. Win by clearing node 10, lose if all raiders fall.

## Current Resource Model

- Each raider has individual HP.
- The group shares Mana.
- The group shares Aura.
- Aura absorbs most incoming monster damage before HP is hit.
- Mana recharges slowly over time.
- Repair Aura costs shared Mana.
- Gold is earned per room and spent in the shop.

## Design Principles

- Keep combat controls minimal: select raider, select task, optionally focus enemy.
- Prefer readable feedback over new mechanics.
- Every room that advances the node should preserve the economy curve.
- Non-combat rooms are breathers, not dead turns.
- New mechanics should first use existing surfaces: room panel, shop, raider cards, route map.
- Avoid inventory, branching quest trees, and deep skill trees until the run loop is fun.
- Run-level permadeath matters, but individual raider death should not instantly doom the run.
- Desktop hotkeys may reduce input friction, but should not change task timers,
  action power, or resource costs.
- Mobile should remain tap-first, readable, and chaotic in a fun way.

## Balance Rules

- Combat room: normal risk, normal gold.
- Story room: no combat risk, reduced gold.
- Chest room: no combat risk, bonus gold.
- Shop prices and room rewards should stay centralized in the game model.
- If a room advances difficulty, it should either give gold or a meaningful recovery effect.
- Avoid hidden penalties while tuning the prototype.

Current economy targets:

- Combat reward: `BASE_GOLD_REWARD + floor * GOLD_PER_FLOOR`
- Story reward: about 70% of combat reward
- Chest reward: about 130% of combat reward

## Demo Priorities

These matter first because the game needs to present well and support a deployed demo.

- [x] Start/title screen
  - Title: `Fantasy Trail Legends`
  - Artwork or strong generated/key visual
  - Start button
  - Short tagline
  - Link/entry point to leaderboard
- [x] Run intro flow
  - Start screen transitions into node 1
  - Explain controls with minimal UI text
- [x] Leaderboard foundation
  - Store high scores
  - Show top scores
  - Show current/player best if authenticated
- [x] Auth handoff from `../../payload-3-boilerplate`
  - Signed launch token or equivalent handoff
  - Game verifies user id/handle
  - Anonymous play should still work
- [x] End-of-game recap screen
  - Show result, score, floor, gold, and elapsed time
  - Submit ranked score for authenticated Portal launches
  - Return to title screen
- [x] Railway deployment path
  - SQLite database on persistent volume
  - Production build/start scripts verified
  - Environment variables documented

## Demo Leaderboard Shape

Recommended first version:

- SQLite table: `scores`
- Fields:
  - `id`
  - `user_id`
  - `handle`
  - `score`
  - `floor`
  - `gold`
  - `result`
  - `created_at`
- API routes:
  - `GET /api/session`
  - `GET /api/scores`
  - `POST /api/scores`
- Auth behavior:
  - Authenticated users can submit ranked scores.
  - Anonymous users can play but are not ranked, or are shown as local/unranked.

## Near-Term Gameplay Checklist

- [x] Desktop keyboard shortcuts
  - `1`, `2`, `3`, `4`: select raider.
  - `A`: assign Attack.
  - `R`: assign Repair Aura.
  - `Shift + 1..4`: focus enemy target.
  - Do not add multi-command macros yet.
- [x] Mobile combat layout pass
  - Tighten layout so party, actions, and enemies fit better.
  - Keep tap targets large enough for raiders, actions, and enemy focus.
  - Make action controls sticky or easier to reach during combat.
  - Shrink/hide lower-priority log text during combat if needed.
  - Keep route map and Aura/Mana bars visible but compact.
- [x] Shop heal/revive
  - Heal all living raiders for gold.
  - Revive one fallen raider for more gold at full HP.
  - Keep it shop-only for now.
- [x] Make revive rules explicit
  - Dead raiders do not freely revive between rooms.
  - Shop revive is the first recovery lever.
- [ ] Improve combat feedback
  - Aura flash when monsters hit.
  - Attack animation from raider toward target.
  - Repair pulse into aura bar.
  - Damage numbers near the target.
- [x] Boss room at node 10
  - Distinct dragon art treatment.
  - Four targetable parts: head, left claw, right claw, wings.
  - Final Dragon Heart phase after the parts are destroyed.
  - Slightly different reward/result screen remains future polish.
- [x] Tune early run economy
  - Player should usually afford one useful shop action after node 1.
  - Story/chest should not leave the player under-upgraded.
  - First pass: delayed 4-enemy rooms and softened enemy HP/damage/attack scaling.
  - Second pass: floor 6 was too punishing; normal 4-enemy rooms now wait until floor 9, with a flatter HP/damage curve.

## Character / Party Ideas

- [x] Donkey raider
  - Weak attack.
  - Funny story hooks.
  - Weak aura repair.
  - Adds charm without much system complexity.
- [ ] Simple role paths
  - Fighter: tank / heavy hit.
  - Wizard: mana recharge / magic hit.
  - Bard: aura repair / utility.
  - Keep to 1-2 upgrades per character before full trees.
- [ ] Future raider recruitment
  - Story room can add a new raider.
  - Recruitment should be rare and exciting.

## Future Combat Mechanics

Consider these after the base loop feels good:

- Special track actions
  - Long press / hold to charge.
  - Big cooldown or mana cost.
  - Examples:
    - Attack all enemies.
    - Heal all raiders.
    - Temporary fast mana recharge.
    - Emergency aura burst.
    - Temporary attack/repair speed boost.
- Weapon upgrades
  - Attack power.
  - Attack speed.
  - Maybe target priority or splash later.
- Enemy identities
  - Fast weak attacker.
  - Shield breaker.
  - Poison/sickness.
  - Summoner.
  - Slow heavy hitter.

## Input and Platform Targets

### Desktop

Mouse should work, but keyboard shortcuts should be the preferred high-skill
input path during combat.

Initial shortcut map:

- `1`, `2`, `3`, `4`: select Fighter, Wizard, Bard, Donkey.
- `A`: assign Attack to the selected raider.
- `R`: assign Repair Aura to the selected raider.
- `Shift + 1`, `Shift + 2`, `Shift + 3`, `Shift + 4`: focus enemy by visible order.

Balance guardrails:

- Hotkeys only speed up command entry.
- Do not reduce task timers for keyboard users.
- Do not add all-party commands or macros until combat is tuned.
- The same decisions should be available through pointer/touch.

### Mobile

Mobile should be tap-only and slightly frantic, but not cramped to the point of
mis-taps.

Layout goals:

- Party cards, enemy cards, and action buttons should be close together.
- Action buttons should stay reachable during combat.
- Enemy focus should be possible from the battle lane or enemy list.
- Route map and shared resources should remain visible in compact form.
- Nonessential log/history can be reduced during active combat.

## Future Story Room Effects

Start with safe effects, then add risk:

- Restore HP.
- Restore Aura.
- Restore Mana.
- Gain extra gold.
- Pay tax / lose gold.
- Raider gets sick.
- Gain a new raider.
- Temporary buff.
- Temporary debuff.

Rule: story effects should be short, readable, and easy to resolve from one button or one simple choice.

## Roguelite / Meta Progression Ideas

Defer until the core run loop is fun. Meta progression should not hide weak balance.

- Unlock new starting raiders.
- Unlock alternate donkey variants.
- Unlock new story room pool.
- Small starting gold bonus.
- Cosmetic titles.
- Relics/artifacts for a single run.
- Curses for harder rooms and better rewards.
- Elite rooms.
- Campfire/rest nodes.
- Route choice between 2-3 next nodes.
- Run modifiers.

## Product Polish

- [ ] Start screen artwork.
- [ ] Better title typography.
- [ ] Result screen after death/win.
- [ ] More readable combat staging.
- [ ] Enemy target highlight polish.
- [ ] Sound hooks later, after visual feedback feels good.

## What Not To Build Yet

- Full inventory.
- Branching dialogue trees.
- Deep class skill trees.
- Complex item systems.
- Pathfinding or caravan interior movement.
- Multiple currencies.
- Meta progression that changes balance before the base game is tuned.

## Open Decisions

- Should raiders auto-revive between rooms, or only via shop?
- Should story/chest rooms always go to shop, or sometimes continue directly?
- Should the shop appear after every node, or only after room rewards?
- Should anonymous leaderboard scores be shown locally or ignored?
- What signed-token format will `payload-3-boilerplate` provide?
