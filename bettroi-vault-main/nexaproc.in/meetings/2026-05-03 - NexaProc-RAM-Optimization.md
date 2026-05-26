---
date: 2026-05-03
source: fathom
url: https://fathom.video/calls/659526307
call_id: 659526307    # this is the number shown in Fathom's URL bar
recording_id: 143041596    # internal API id, not shown in Fathom UI
project: nexaproc.in
description: "Python worker RAM exhaustion resolved; disabled Nexa Pulse freed 15GB; optimized PDF batch processing for large files."
---# NexaProc RAM Optimization

*2026-05-03 — [Open in Fathom](https://fathom.video/calls/659526307)*

> Python worker RAM exhaustion resolved; disabled Nexa Pulse freed 15GB; optimized PDF batch processing for large files.

### Root cause Python worker killed by kernel — RAM constraints. Service call-out consuming excessive memory. ### RAM audit Nexa Pulse consuming 15.62 GB (largest, no active work — created for tender review not in use). Disabled Nexa Pulse → 15 GB RAM freed. ### Multi-page PDF batch processing Large PDFs (400-500 pages, investment guidelines, banking norms): chunked upload, batch processing approach.
