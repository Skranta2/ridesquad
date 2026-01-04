# RideSquad – TODO & Roadmap

Last updated: 2025-12-18

## Completed (Ready)

- **[d1] PRD created** (`/docs/PRD.md`)
- **[d2] Expo mobile app scaffold + identity** (RideSquad name + scheme `ridesquad`)
- **[d3] Navigation/Tabs** per PRD: Connect, Friends, Teams, Settings (+ icons)
- **[d4] Localization foundation** (SV/EN/FI/NO/DE/ES) + localized tab titles
- **[d5] Theme foundation** (system/light/dark) + expanded iOS-like color palette
- **[d6] Settings + Help shell** (Appearance + Language pickers, Help links) + `/qa` screen
- **[d7] Persist settings** (theme + language) using AsyncStorage + prevent startup flicker
- **[d8] Dev server reliability fix**: `metro.config.js` disables Watchman (macOS permission issue)

## Upcoming roadmap (estimates)

### Week 1 (1–3 days total)

- **[u1] Supabase Email OTP auth + onboarding profile + marketing consent** (1.5–2.5 days)
  - Email OTP flow + session persistence
  - Create user profile row on first login
  - Marketing consent capture + storage (GDPR compliant)

### Week 2 (2–4 days total)

- **[u2] RevenueCat subscriptions** (1.5–2.5 days)
  - Paywall, restore purchases, entitlement handling
  - Client-side gating helpers (Basic/Premium limits)
- **[u6] Supabase schema + RLS + edge functions placeholders** (1–1.5 days)
  - Tables for profiles/teams/team_members/invites/favorites/waitlist
  - RLS policies to enforce access + quotas (server-authoritative)

### Week 3 (3–5 days total)

- **[u3] Invite-by-link + QR scaffolding + deep links** (1.5–2.5 days)
  - Generate invite links, accept/join screens
  - QR display/scan scaffolding
- **[u4] Teams UX: 24h re-activation + owner roster visibility** (1.5–2.5 days)

### Week 4 (3–6 days total)

- **[u5] Favorites + waitlist UX** (1.5–3 days)
  - 15 favorites cap, overflow waitlist
  - “promote from waitlist” when favorite removed
  - Recent list (30 days)
- **[u8] App Store/GDPR compliance polish** (1.5–3 days)
  - Account deletion UX
  - Privacy + consent screens, data export/deletion hooks (placeholder if needed)

### Parallel / Spike (can start anytime, ideally Week 2–4)

- **[u7] Audio/voice tech spike + integration plan** (2–5 days)
  - Evaluate SFU (LiveKit/Daily/Twilio/Agora)
  - Headset UX + permissions + background audio constraints
  - Decide architecture for v1

## Notes on estimates

- Estimates assume “minimal but correct v1 scaffolding,” not full polish.
- Biggest uncertainty is **voice stack selection + iOS audio behavior**, hence the spike.
