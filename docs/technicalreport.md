# Technical Report

## 1. Initial Assessment

The existing Fleet Ping Service was reviewed as an inherited Node.js/Express application with PostgreSQL.

Key issues identified:

- Database credentials and configuration were hardcoded.
- Database hostname was hardcoded, limiting environment portability.
- Login used string-concatenated SQL, creating a confirmed SQL injection vulnerability.
- `/api/admin/drivers` had no authentication or authorization.
- OTP was accepted but not actually verified.
- A new PostgreSQL connection was created for every fleet-ping request.
- Database failures in the login path could terminate the Node.js process.
- Docker Compose PostgreSQL configuration did not match the application's database configuration.
- PostgreSQL was unnecessarily exposed through the host.
- PostgreSQL schema used `TIMESTAMP` without timezone.

The highest-priority changes were therefore security, secret management, database reliability, and administrative access control.

---

## 2. Changes Made

### Application

- Replaced hardcoded database configuration with environment variables.
- Moved JWT secret to environment-based configuration.
- Replaced SQL string concatenation in login with a parameterized query.
- Added basic validation for fleet-ping input.
- Added JWT authentication for the admin endpoint.
- Added admin-role authorization.
- Added a `role` field to drivers and configured the test driver as admin.
- Added error handling to the admin endpoint.
- Improved login database error handling.
- Replaced per-request PostgreSQL connections with a connection pool.

### Docker Compose

- Application now connects to the `db` service.
- Database credentials are provided through environment variables.
- Removed PostgreSQL host-port exposure.
- Added PostgreSQL healthcheck.
- Application startup waits for PostgreSQL to become healthy.

---

## 3. Containerization

The application is packaged as a Docker image and configuration is supplied at runtime rather than embedded in the image.

Images are tagged using the Git commit SHA:

```text
vexardrivedevacr.azurecr.io/vexardrive:<commit-sha>
```

This provides a traceable and reproducible deployment artifact and allows a previous image to be redeployed for rollback.

---

## 4. Azure Infrastructure

Terraform manages the Azure infrastructure.

The deployed architecture uses:

- Azure Container Apps
- Azure Container Registry
- Azure Database for PostgreSQL Flexible Server
- Azure Key Vault
- User-assigned Managed Identity
- Azure RBAC
- Azure Virtual Network
- PostgreSQL delegated subnet
- Private DNS

PostgreSQL is configured with public network access disabled.

### Container Apps vs AKS

Azure Container Apps was selected instead of AKS because this is currently a small containerized service and does not require Kubernetes-specific capabilities.

This reduces operational complexity while still providing a managed container runtime.

---

## 5. CI/CD

GitHub Actions is used for deployment.

The implemented flow is:

```text
Git push
  ↓
GitHub Actions
  ↓
Azure OIDC authentication
  ↓
Docker build
  ↓
Push image to ACR
  ↓
Deploy image to Container Apps
```

The image is tagged with the Git commit SHA rather than relying on `latest` for deployment.

GitHub OIDC avoids storing a long-lived Azure client secret in GitHub Actions.

For a full production pipeline, the next step would be to explicitly add automated tests, container security scanning, deployment verification, environment promotion, and production approval gates.

---

## 6. Database Operations

Azure Database for PostgreSQL Flexible Server is used for persistent storage.

The current configuration includes:

- PostgreSQL 16
- Seven-day backup retention
- Public network access disabled
- Private networking through the delegated PostgreSQL subnet
- Private DNS

The application now uses connection pooling rather than opening a new database connection for every fleet-ping request.

As fleet size increases, database operations should evolve based on measured traffic by monitoring connections, CPU, storage and query performance, followed by indexing, capacity scaling and, if required, partitioning or archival of high-volume historical ping data.

Point-in-time recovery is provided by Azure PostgreSQL backups. Restore testing should be performed regularly in a production environment.

---

## 7. Secrets, Identity and Networking

Application secrets are not stored in source code or container images.

Azure Key Vault stores application secrets such as:

- PostgreSQL credentials
- JWT secret

The Container App uses a managed identity to access Key Vault through Azure RBAC.

The security model is:

```text
Container App
     ↓
Managed Identity
     ↓
Azure RBAC
     ↓
Key Vault
```

GitHub Actions uses OIDC federation for Azure authentication.

The database is private and has public network access disabled. The application communicates with PostgreSQL through the private Azure networking configuration.

The application ingress is the externally accessible component; PostgreSQL and its subnet remain private.

---

## 8. Monitoring and Observability

The application should expose separate health and readiness endpoints:

```text
/health
/ready
```

The distinction is:

- `/health` — application process is alive.
- `/ready` — application is ready to serve requests and required dependencies are available.

Important operational signals are:

- HTTP 5xx error rate
- request latency
- request volume
- container/revision failures
- application restarts
- PostgreSQL CPU and storage
- PostgreSQL connection usage
- database connection failures

Important alerts would include sustained API errors, high latency, database connection exhaustion, database resource saturation, and failed container revisions.

Structured application logging should be used without logging credentials, tokens, or other sensitive values.

---

## 9. Architecture Decisions and Trade-offs

### Azure Container Apps

Chosen over AKS to avoid unnecessary Kubernetes operational complexity for the current service.

### Managed PostgreSQL

Chosen instead of self-hosting PostgreSQL to reduce database administration and provide managed backup/recovery capabilities.

### Private PostgreSQL

Public database access is unnecessary because only the application needs database connectivity. Therefore the database is kept private.

### Key Vault + Managed Identity

Chosen to avoid embedding secrets in application code, images, or long-lived workload credentials.

### Commit-Based Images

Chosen because every deployed image can be mapped directly to a source commit and previous versions can be redeployed.

### Connection Pooling

Chosen because fleet-ping traffic can be frequent and bursty. Reusing connections is more efficient than creating a new connection for every request.

---

## 10. Known Limitations

### OTP Verification

OTP verification was not implemented because the starter repository does not provide an OTP provider or OTP storage mechanism.

A complete implementation would require OTP generation, storage, expiry, delivery and verification.

### Additional Production Hardening

With additional time, I would add:

- automated application tests
- explicit security scanning in CI
- deployment smoke tests
- staging-to-production promotion
- production approval gates
- formal database migration handling
- production dashboards and alert rules
- tested database restore procedures
- load testing using realistic fleet-ping traffic

These are documented as remaining work rather than represented as completed functionality.

---

## 11. Cost and Scalability Considerations

The architecture intentionally avoids unnecessary infrastructure.

Container Apps was selected instead of AKS to reduce operational and platform cost for the current workload.

The current PostgreSQL SKU is appropriate for the assessment/development environment. Production sizing should be based on actual fleet size, request volume, database connections, CPU, storage and recovery requirements.

As traffic grows, scaling should first be driven by measurements from the application and PostgreSQL rather than introducing additional infrastructure prematurely.

---

## 12. What I Would Address Next

The next priorities would be:

1. Complete automated test coverage.
2. Add security scanning and deployment verification to CI/CD.
3. Introduce staging and controlled production promotion.
4. Establish production alert thresholds and dashboards.
5. Perform regular PostgreSQL restore testing.
6. Load-test fleet-ping traffic and tune application/database scaling.
7. Implement complete OTP verification and rate limiting.

---

## 13. Final Architecture

The resulting architecture separates application execution, persistence, secrets, identity and deployment responsibilities:

```text
Fleet Clients
     │
     ▼
Azure Container Apps
     │
     ├──────────► Azure Key Vault
     │              ▲
     │              │ Managed Identity + RBAC
     │
     ▼
Private Network
     │
     ▼
PostgreSQL Flexible Server

GitHub Actions
     │
     │ OIDC
     ▼
Azure
     │
     ▼
Azure Container Registry
     │
     ▼
Container Apps
```

The detailed architecture diagram is provided separately as:

`docs/architecture.png`

and embedded in `docs/architecture.md`.

---

## 14. AI Tool Usage

AI tools were used during the assessment for technical troubleshooting, implementation assistance, infrastructure reasoning and documentation.

All submitted changes were reviewed and validated against the application and Azure deployment behavior.



Note:
Demo video could not be included due to time constraints. The repository and technical report contain the implemented solution and deployment details.
