import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type ScoreResult = "won" | "game-over";

export interface ScoreInput {
  durationMs: number;
  floor: number;
  gold: number;
  handle: string;
  portalProfileID?: string;
  portalUserID: string;
  result: ScoreResult;
  score: number;
}

export interface ScoreRow extends ScoreInput {
  createdAt: string;
  id: number;
}

let db: Database.Database | null = null;

export function getLeaderboard(limit = 10): ScoreRow[] {
  const database = getDb();
  return database
    .prepare(
      `select
        id,
        portal_user_id as portalUserID,
        portal_profile_id as portalProfileID,
        handle,
        score,
        floor,
        gold,
        result,
        duration_ms as durationMs,
        created_at as createdAt
      from scores
      order by score desc, floor desc, gold desc, created_at asc
      limit ?`,
    )
    .all(limit) as ScoreRow[];
}

export function getPersonalBest(portalUserID: string): ScoreRow | null {
  const database = getDb();
  return (
    (database
      .prepare(
        `select
          id,
          portal_user_id as portalUserID,
          portal_profile_id as portalProfileID,
          handle,
          score,
          floor,
          gold,
          result,
          duration_ms as durationMs,
          created_at as createdAt
        from scores
        where portal_user_id = ?
        order by score desc, floor desc, gold desc, created_at asc
        limit 1`,
      )
      .get(portalUserID) as ScoreRow | undefined) ?? null
  );
}

export function insertScore(input: ScoreInput): ScoreRow {
  const database = getDb();
  const createdAt = new Date().toISOString();
  const result = database
    .prepare(
      `insert into scores (
        portal_user_id,
        portal_profile_id,
        handle,
        score,
        floor,
        gold,
        result,
        duration_ms,
        created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.portalUserID,
      input.portalProfileID ?? null,
      input.handle,
      input.score,
      input.floor,
      input.gold,
      input.result,
      input.durationMs,
      createdAt,
    );

  return { ...input, createdAt, id: Number(result.lastInsertRowid) };
}

function getDb() {
  if (db) return db;

  const dbPath = process.env.SQLITE_PATH ?? path.join(process.cwd(), "data", "fantasy-trail-legends.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    create table if not exists scores (
      id integer primary key autoincrement,
      portal_user_id text not null,
      portal_profile_id text,
      handle text not null,
      score integer not null,
      floor integer not null,
      gold integer not null,
      result text not null,
      duration_ms integer not null,
      created_at text not null
    );

    create index if not exists scores_rank_idx
      on scores (score desc, floor desc, gold desc, created_at asc);

    create index if not exists scores_portal_user_idx
      on scores (portal_user_id, score desc);
  `);

  return db;
}
