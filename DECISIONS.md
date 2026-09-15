# Engineering Decisions

Rationale behind the key technical choices made in this project, including trade-offs considered.

---

## Why TypeScript over plain JavaScript

Catches type errors at compile time rather than runtime, which matters for a backend handling auth, payments-adjacent flows, and file operations. Adds a build step (`tsc`) but the safety trade-off is worth it for a project intended to demonstrate production-quality code.

---

## Why MongoDB Atlas (managed) instead of self-hosting MongoDB in Kubernetes

Self-hosting a database in Kubernetes requires a `StatefulSet` with `PersistentVolumeClaims`, and the operator is then responsible for replication, backups, and failover — significant operational overhead. Atlas (a managed DBaaS) handles all of this. For this project's scope, a managed service is the more realistic, production-representative choice; the trade-off (less infrastructure control, free-tier connection limits — see Results) was accepted and explicitly documented rather than hidden.

---

## Why `bcrypt` (native) over `bcryptjs` (pure JS)

Originally used `bcryptjs` for simplicity (no native build step). Load testing revealed it blocks Node's single main thread during password hashing — under concurrent load, every request effectively queued behind the one currently hashing, capping throughput regardless of concurrency (~12–14 req/sec at both 20 and 100 connections). Native `bcrypt` offloads hashing to libuv's thread pool, keeping the event loop free. This was **discovered empirically through load testing**, not assumed upfront — the fix was validated by re-running the same test and confirming the flat-throughput pattern disappeared.

---

## Why a multi-stage Docker build

A single-stage build would ship the TypeScript compiler, dev dependencies, and full source tree inside the production image — larger attack surface, larger image, slower deploys. The multi-stage build compiles in a `builder` stage and copies only the compiled `dist/` output plus production dependencies into the final image.

---

## Why Kubernetes locally (Docker Desktop) rather than only cloud deployment

The existing production deployment (AWS EC2 + Vercel) was already stable and serving the business owner's needs — load-testing or experimenting directly against it risked breaking a working, hard-won setup for no real benefit. A local Kubernetes cluster (Docker Desktop's built-in single-node cluster) gave an isolated, disposable environment to containerize the app, break things safely, debug real failures, and load-test aggressively — without any risk to the live deployment. This mirrors how production engineering teams use staging environments.

---

## Why CPU-based HPA (and its documented limitation)

CPU utilization is the standard, simplest starting metric for autoscaling and required no extra tooling beyond the Metrics Server. It worked as expected under the bcrypt-hashing workload (CPU-bound). However, testing also surfaced a limitation worth documenting: for I/O-bound work (e.g., waiting on MongoDB Atlas network round-trips), CPU can stay low even while requests queue and latency rises — CPU-based HPA would not trigger a scale-out in that scenario. A production system with a mixed workload profile would likely need request-latency or request-count-based custom metrics in addition to CPU.

---

## Why resource `requests`/`limits` were set based on load-test data, not defaults

An initial guess of `500m` CPU limit per pod was tested first — and made performance *worse* under load (987 timeouts at 500 concurrent connections) due to CPU throttling, not better. Rather than guessing a "safer-sounding" higher number, the limit was right-sized against the actual host's available cores (8) and re-tested, confirming zero errors at nearly double the concurrent load (900 connections). Resource limits are treated as a measured parameter, not a fixed default.

---

## Why the MongoDB Atlas free-tier (M0) limitation was documented rather than "fixed"

Under sustained 100+ concurrent DB-backed requests, the M0 tier's connection pool produced timeouts. The team decision was to **stay on the free tier** (a legitimate scope/cost decision for a portfolio-stage project) and document the limitation with root-cause evidence (connection pool logs), rather than either silently ignoring it or paying for a tier upgrade with no current business justification. This mirrors a real engineering trade-off: not every discovered limitation needs to be immediately fixed — it needs to be understood, quantified, and consciously deferred if the cost/benefit doesn't justify acting now.

---

## Why two separate repositories (frontend / backend)

Enables independent deployment pipelines (Vercel for frontend, containerized/Kubernetes-ready for backend), independent versioning, and a clean separation of concerns — the backend's Docker/Kubernetes tooling has no reason to live alongside frontend build config.
