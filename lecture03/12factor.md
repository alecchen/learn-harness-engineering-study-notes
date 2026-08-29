# The Twelve-Factor App — Brief Summary

The Twelve-Factor App is a methodology for building SaaS/web applications that are
easy to deploy, scale, restart, and maintain across environments. :contentReference[oaicite:0]{index=0}

## The 12 Factors

1. **Codebase** — One codebase in version control, many deployments.
2. **Dependencies** — Explicitly declare and isolate all dependencies.
3. **Config** — Keep environment-specific configuration outside the code.
4. **Backing Services** — Treat databases, caches, queues, and storage as external resources.
5. **Build, Release, Run** — Separate building, releasing, and running the application.
6. **Processes** — Run the application as **stateless processes**; important state lives outside the process.
7. **Port Binding** — The application exposes its service through a port.
8. **Concurrency** — Scale by running more processes/instances.
9. **Disposability** — Processes should start quickly and shut down gracefully.
10. **Dev/Prod Parity** — Keep development, staging, and production environments as similar as possible.
11. **Logs** — Treat logs as event streams and let the environment handle storage/processing.
12. **Admin Processes** — Run migrations, maintenance, and other one-off tasks separately.

## Core Idea

> **Keep the application process replaceable and keep persistent state outside the process.**

This makes it possible to restart, replace, move, or scale application processes
without losing important data.

```text
                 Load Balancer
                /      |      \
               ↓       ↓       ↓
           Process A Process B Process C
               \       |       /
                \      |      /
                 ↓     ↓     ↓
              DB / Redis / Queue / Storage