# QuickNotes System Architecture

## 1. Functional requirements

- Users can register, authenticate, and access only their own notes.
- Users can create, read, update, search, and delete notes.
- Users can add tags to notes and filter notes by tag.
- The service validates note titles and returns consistent API errors.
- Users can access their notes from different devices.

## 2. Non-functional requirements

- **Availability:** The service should remain available when an individual app server fails.
- **Performance:** Common note reads should be fast, with caching used where appropriate.
- **Scalability:** App servers can be added as traffic increases.
- **Security:** Use HTTPS, secure password hashing, access controls, input validation, and parameterised SQL.
- **Durability:** Persist notes in a reliable database and maintain tested backups.
- **Observability:** Collect logs, metrics, traces, and alerts to detect failures.

## 3. Load estimates for 1 million users

### Assumptions

- 1,000,000 registered users.
- 10% are active daily: 100,000 daily active users.
- Each active user views 50 note/feed pages per day.
- Each active user creates 1 note per day.
- Each note stores about 2 KB of text and metadata on average.
- A day contains 86,400 seconds.
- Peak traffic is five times average traffic.
- All notes are retained for one year; indexes, replicas, backups, and overhead are excluded from the base storage estimate.

### Reads per second

Daily reads = 100,000 × 50 = 5,000,000.

Average reads per second = 5,000,000 ÷ 86,400 ≈ **58 reads/second**.

Peak reads per second ≈ 58 × 5 = **290 reads/second**.

### Writes per second

Daily note writes = 100,000 × 1 = 100,000.

Average writes per second = 100,000 ÷ 86,400 ≈ **1.16 writes/second**.

Peak writes per second ≈ 1.16 × 5 = **5.8 writes/second**.

These write estimates count note creations only; edits, deletes, tag changes, and other database writes would increase the real total.

### Storage per year

Daily storage = 100,000 × 2 KB = 200,000 KB ≈ 200 MB.

Annual storage = 200 MB × 365 = **73,000 MB, or about 73 GB per year**.

This is a simplified estimate for note content and basic metadata, excluding indexes, database overhead, replicas, backups, and any uploaded attachments.

The system is **read-heavy** under these assumptions because note reads greatly outnumber note creations. Therefore, the design prioritises efficient reads, caching, and a database read replica.

## 4. Architecture diagram

```text
                +------------------+
                | Client / Browser |
                +--------+---------+
                         |
                         v
                +------------------+
                |       DNS        |
                +--------+---------+
                         |
                         v
                +------------------+
                |       CDN        |
                | Static assets    |
                +--------+---------+
                         |
                         v
                +------------------+
                |  Load Balancer   |
                +--------+---------+
                         |
              +----------+----------+
              |                     |
              v                     v
       +--------------+      +--------------+
       | App Server 1 |      | App Server 2 |
       +------+-------+      +------+-------+
              |                     |
              +----------+----------+
                         |
              +----------+----------+
              |                     |
              v                     v
       +--------------+      +--------------+
       | Cache        |      | Primary DB   |
       | (Redis)      |      +------+-------+
       +--------------+             |
                                    v
                             +--------------+
                             | Read Replica |
                             +--------------+

       App servers also publish asynchronous jobs:
                         |
                         v
                  +-------------+
                  | Job Queue   |
                  +------+------+
                         |
                         v
                  +-------------+
                  | Queue Worker|
                  +-------------+
```

## 5. What each component solves

- **Client / Browser:** Provides the user interface and sends API requests.
- **DNS:** Resolves the service domain to its network endpoint.
- **CDN:** Caches and serves static files close to users, reducing latency and origin traffic.
- **Load balancer:** Distributes requests among healthy app servers and stops one server becoming a bottleneck.
- **App servers:** Run API logic, authenticate users, validate requests, and enforce note ownership.
- **Cache (Redis):** Speeds up repeated reads and reduces pressure on the primary database; cache entries must be invalidated or refreshed when notes change.
- **Primary database:** Stores durable, authoritative user, note, tag, and relationship data.
- **Read replica:** Handles suitable read queries to reduce read load on the primary database, with the possibility of replication lag.
- **Job queue:** Holds background work so slow tasks do not block user-facing requests.
- **Queue worker:** Processes background jobs such as notifications, exports, or future attachment processing.

## 6. Flow for `GET /notes`

1. The client resolves the API hostname through DNS and sends an HTTPS request.
2. The load balancer forwards the request to a healthy app server.
3. The app server authenticates the user and checks access permissions.
4. The server checks Redis for a cached list of that user's notes.
5. On a cache hit, the server returns the cached result. On a miss, it queries the read replica when appropriate.
6. The server caches the result with a suitable expiry and returns a paginated JSON response.
7. If the data has just been changed and must be immediately consistent, the application can read from the primary database instead.

## 7. Flow for `POST /notes`

1. The client sends `POST /notes` with a JSON title and optional body over HTTPS.
2. The load balancer forwards the request to a healthy app server.
3. The app server authenticates the user, validates the title, and checks request permissions.
4. The server inserts the note into the primary database using a parameterised query and records the authenticated user's ID.
5. After the database transaction succeeds, the server invalidates or updates the user's cached notes so subsequent reads do not show stale data.
6. If background work is needed, such as sending a notification, the server publishes a job to the queue.
7. The server returns `201 Created` with the new note's ID and representation.

## 8. Trade-offs

### Cache speed versus data freshness

Caching reduces read latency and database load, but cached notes can become stale after a create, update, or delete. The service should invalidate affected cache keys after successful writes and use sensible expiration times.

### Read replicas versus consistency

A read replica increases read capacity, but it may lag behind the primary database. Recently written data can be read from the primary when immediate consistency is important.

### Asynchronous jobs versus immediate completion

A queue lets requests finish without waiting for slow background tasks, but jobs can be delayed or fail. Workers should retry safely, use idempotent processing where possible, and send repeatedly failing jobs to a dead-letter queue.

### Redundancy versus cost and complexity

Multiple app servers, health checks, and a load balancer reduce the risk of one app server failing, but increase operating cost and monitoring needs. A managed, highly available load balancer, multiple app-server instances across failure zones, database backups, and a tested database failover procedure help avoid single points of failure. Redis and the queue should also be deployed with suitable replication or managed high-availability options.

## 9. Avoiding single points of failure

Run at least two app servers and distribute them across separate failure zones behind a health-checking load balancer. Use a highly available database deployment with backups and a tested promotion process for the read replica or standby. Deploy the cache and queue with redundancy, monitor their health, and define recovery procedures. A read replica alone is not a complete failover plan unless promotion and application reconnection are configured and tested.
