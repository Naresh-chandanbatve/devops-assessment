# Assessment Notes

## Initial findings

- DB credentials are hardcoded in server.js and docker-compose.
- DB hostname is hardcoded, so app can't easily use different environments.
- docker-compose has a local Postgres container, but server.js doesn't use it.
- /api/auth/login can crash the Node process if DB connection fails.
- /api/fleet/ping handles DB errors, but login doesn't.
- New PostgreSQL connection is created for every ping request. This will not scale well for a high-frequency endpoint.
- OTP is accepted but never actually verified. Any OTP works for an existing phone number.
- Login has SQL injection because phone is directly concatenated into the query. Confirmed locally.
- /api/admin/drivers is accessible without authentication and returns driver data.
- Fleet ping inserts successfully and data is stored in Postgres.
- fleet_pings.ts uses TIMESTAMP without timezone.