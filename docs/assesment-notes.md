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
- Fleet ping inserts succesfully and data is stored in Postgres.
- schema.sql uses TIMESTAMP without timezone.


## Changes made till now

- Changed PostgreSQL usage from creating a new client for every request to using a connection pool.
- Moved DB host, port, user, password, database name and JWT secret to environment variables.
- Added basic validation for fleet ping request data.
- Changed login query to use a parameterized query instead of string concatenation.
- Added a role column to drivers and set the test driver as admin.
- Added JWT authentication and admin role check for /api/admin/drivers.
- Added error handling to the admin drivers endpoint.
- OTP verification is still not implemented because the starter repository does not contain an OTP provider or OTP storage mechanism.
- Added Docker Compose healthcheck for PostgreSQL.
- Changed application database host to the Docker Compose db service.
- Removed PostgreSQL host port exposure from Compose.
- Added environment-based database credentials to Compose.
- Updated Docker Compose startup to wait for a healthy database.