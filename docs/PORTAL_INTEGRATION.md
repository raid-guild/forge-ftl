# Portal Integration

Fantasy Trail Legends uses the Portal external module signed-launch flow.

Reference:

- `../../payload-3-boilerplate/docs/external-module-integration-guide.md`

## Portal Module Settings

Recommended Payload `modules` record:

```txt
name: Fantasy Trail Legends
slug: fantasy-trail-legends
moduleKind: external
authMode: signed_launch
externalCallbackURL: https://your-game.example.com/portal/callback
launchSecretEnvKey: FANTASY_TRAIL_LEGENDS_LAUNCH_SECRET
launchAudience: fantasy-trail-legends
launchTokenTTLSeconds: 120
visibility: authenticated or member
enabled: true
```

## Game Environment

The game expects:

```txt
PORTAL_MODULE_LAUNCH_SECRET=shared-secret-from-portal
PORTAL_MODULE_AUDIENCE=fantasy-trail-legends
PORTAL_MODULE_SLUG=fantasy-trail-legends
PORTAL_MODULE_ISSUER=https://portal.raidguild.org
SESSION_SECRET=separate-local-session-secret
SQLITE_PATH=/data/fantasy-trail-legends.sqlite
```

`SQLITE_PATH` should point at a Railway persistent volume path in production.
If omitted, local development uses `./data/fantasy-trail-legends.sqlite`.

## Flow

1. Portal launches `/api/modules/fantasy-trail-legends/launch`.
2. Portal redirects to `/portal/callback?token=<jwt>`.
3. The game verifies:
   - `HS256` signature
   - `typ === "portal_module_launch"`
   - issuer
   - audience
   - module slug
   - expiration
4. The game stores a signed local session cookie.
5. Ranked score submission uses the local session identity.

Anonymous users can still play practice runs, but score submission returns `401`.

## Local Testing

The title screen works without Portal launch and shows anonymous practice mode.
To test ranked mode locally, mint a compatible HS256 JWT with the shared secret
and visit:

```txt
http://localhost:3001/portal/callback?token=<jwt>
```

Helper command:

```bash
PORTAL_MODULE_LAUNCH_SECRET=dev-secret npm run portal:token
```

For local callback verification, run the app with the same secret:

```bash
PORTAL_MODULE_LAUNCH_SECRET=dev-secret npm run dev
```

Optional identity overrides:

```txt
PORTAL_TEST_USER_ID=13
PORTAL_TEST_PROFILE_ID=36
PORTAL_TEST_HANDLE=demo-raider
PORTAL_TEST_NAME="Demo Raider"
PORTAL_TEST_EMAIL=demo@example.com
```
