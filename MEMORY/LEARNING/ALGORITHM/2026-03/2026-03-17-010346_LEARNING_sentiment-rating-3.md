---
capture_type: LEARNING
timestamp: 2026-03-17 01:03:46 PST
rating: 3
source: implicit
auto_captured: true
tags: [sentiment-detected, implicit-rating, improvement-opportunity]
---

# Implicit Low Rating Captured: 3/10

**Date:** 2026-03-17
**Rating:** 3/10
**Detection Method:** Sentiment Analysis
**Feedback:** Configuration error after Navi's changes broke bridge setup

---

## Context

Ivan was attempting to diagnose and fix the MCP bridge connection (which should show 🟢 but was showing 🔴). He followed a logical troubleshooting sequence: exit Gemini, restart it, check MCP status. After restarting, Gemini revealed a critical configuration error introduced by Navi's code changes — specifically, the bridge server configuration now contains an unrecognized key 'sseUrl' that doesn't match the current MCP specification. This is a direct consequence of Navi switching the backend from Bun.serve to node:http without properly updating the configuration schema. Ivan's implicit frustration stems from: (1) the configuration being broken after Navi's modification, (2) having to debug this mid-workflow, (3) the error message indicating Navi's approach doesn't align with gemini-cli's expected configuration structure. This is a 3 rather than 2 because it's a fixable configuration issue, not a complete system failure, but it required rework after Navi's implementation.

---

## Improvement Notes

This response was rated 3/10 by Ivan. Use this as an improvement opportunity.

---
