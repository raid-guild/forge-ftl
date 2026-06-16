# Railway Deploy Notes

Fantasy Trail Legends is a Next.js app with a small SQLite leaderboard.

## Build and Start

Railway can use the package scripts directly:

```txt
npm install
npm run build
npm run start
```

The app expects Node 20.x.

## Persistent SQLite Volume

Create a Railway volume and mount it at:

```txt
/data
```

Set:

```txt
SQLITE_PATH=/data/fantasy-trail-legends.sqlite
```

The app creates the database and `scores` table on first request to `/api/scores`.

## Required Environment Variables

```txt
PORTAL_MODULE_LAUNCH_SECRET=long-random-shared-secret
PORTAL_MODULE_AUDIENCE=fantasy-trail-legends
PORTAL_MODULE_SLUG=fantasy-trail-legends
PORTAL_MODULE_ISSUER=https://portal.raidguild.org
SESSION_SECRET=separate-long-random-cookie-secret
SQLITE_PATH=/data/fantasy-trail-legends.sqlite
```

`PORTAL_MODULE_LAUNCH_SECRET` must match the secret configured in the Portal
module record via `launchSecretEnvKey`.

## Portal Module Callback

In Payload, configure the external module callback URL to:

```txt
https://<railway-domain>/portal/callback
```

Portal launches the game by redirecting to:

```txt
https://<railway-domain>/portal/callback?token=<jwt>
```

## Smoke Test

After deploy:

```txt
curl -I https://<railway-domain>
curl https://<railway-domain>/api/session
curl https://<railway-domain>/api/scores
```

Expected anonymous session:

```json
{"authenticated":false,"handle":"Stranger","portalUserID":"anonymous","roles":[]}
```

Expected scores response shape:

```json
{"personalBest":null,"top":[]}
```

Anonymous score submission should return `401`.

