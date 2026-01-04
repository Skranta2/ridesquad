# RideSquad — Product Requirements Document (PRD)

**Version:** 1.0 (V1)

**Last updated:** 2025-12-18

---

## 1. Summary
RideSquad is a mobile app for real-time voice communication over the internet, optimized for users wearing Bluetooth headsets connected to their own phone. Users join voice sessions via **invite link or QR code** and must make an explicit **Accept & Join** action to connect.

The app follows Apple Human Interface Guidelines (HIG), supports **Light/Dark/System** appearance, and supports in-app language selection:

- Swedish
- English
- Finnish
- Norwegian
- German
- Spanish

Monetization uses 3 tiers with RevenueCat:

- Free: one-time 60-minute test
- Basic: 2-person sessions (99 SEK/year)
- Premium: up to 15-person sessions, Teams, Favorites (299 SEK/year)

---

## 2. Goals and non-goals

### 2.1 Goals (V1)
- Deliver stable, low-latency voice sessions over the internet.
- Invite-only discovery model (no public directory).
- Subscription gating enforced server-side.
- Premium Teams with:
  - max 5 teams per owner
  - max 15 members per team
  - team invites via link/QR
  - “Active in team” state requiring an explicit choice every 24 hours
- Premium Favorites with:
  - max 15 favorites
  - waitlist for additional favorites
  - manual promotion from waitlist
- GDPR-ready design (data minimization, in-app account deletion, explicit marketing consent).

### 2.2 Non-goals (V1)
- Bluetooth-only/offline intercom networking.
- Capturing and sharing other apps’ audio (GPS prompts feature removed).
- Public user search directory / contact upload.
- Complex moderation systems (block/report may be added later if needed).

---

## 3. Target users and primary use cases
- **Motorcycle:** quick “scan QR → accept → talk”.
- **Work crews:** ad-hoc 2-person talk.
- **Hunting groups:** premium Teams for larger groups.

---

## 4. Platforms and stack (planned)

### 4.1 Client
- React Native (Expo recommended for V1)

### 4.2 Backend
- Supabase
  - Auth: Email OTP
  - Database + Row Level Security (RLS)
  - Realtime (optional) for text chat/presence

### 4.3 Payments
- RevenueCat
  - iOS + Android in-app subscriptions

### 4.4 Voice
- WebRTC with an SFU (recommended hosted provider for V1)
  - Examples: LiveKit / Daily / Twilio / Agora

---

## 5. Subscription tiers & entitlements

### 5.1 Free (“Free”)
- **Voice time:** 60 minutes total usage per verified email account (one-time test)
- **Max participants per session:** 2
- **Invites:** link/QR

### 5.2 Basic (“Basic”) — 99 SEK/year
- **Voice time:** unlimited
- **Max participants per session:** 2
- **Invites:** link/QR

### 5.3 Premium (“Premium”) — 299 SEK/year
- **Voice time:** unlimited
- **Max participants per session:** 15
- **Teams:**
  - Max 5 teams owned at a time
  - Max 15 members per team
  - Invite via link/QR
  - Rename teams
- **Favorites:**
  - Up to 15 favorites
  - Waitlist beyond 15
  - Delete favorite and manually promote from waitlist

### 5.4 Enforcement rules (must be server-side)
- Participant limits enforced at join time.
- Free 60-minute usage enforced by server-tracked usage (not client timers).
- Entitlements checked using RevenueCat as the source of truth (Supabase may cache state but must not be authoritative).

---

## 6. UX requirements (Apple HIG)

### 6.1 Navigation
Bottom tab bar:
- **Connect**
- **Friends**
- **Teams** (Premium; show upsell state if not Premium)
- **Settings**

### 6.2 Appearance
Settings → Appearance:
- System (default)
- Light
- Dark

### 6.3 Language
Settings → Language:
- Swedish, English, Finnish, Norwegian, German, Spanish

All user-facing strings must be localized. Avoid mixed-language screens.

### 6.4 Accessibility
- Dynamic Type support
- VoiceOver labels for all controls
- High contrast compatibility
- Minimum tap target sizes

---

## 7. Functional requirements & acceptance criteria

### 7.1 Authentication (Email OTP)
**Requirements**
- Email OTP sign-in for all users.
- Rate-limit OTP requests and verification attempts.

**Acceptance criteria**
- User can request OTP, verify, and enter the app.
- Resend obeys cooldown.
- Invalid/expired code yields clear error.

---

### 7.2 Account/profile
**Requirements**
- Create/update profile:
  - display name
  - optional avatar
- Choose “type of use” (Motorcycle/Work/Hunting).
- In-app account deletion.

**Acceptance criteria**
- Profile persists across sessions.
- Use-case selection stored and displayed where applicable.
- Account deletion removes user data and prevents login until re-created.

---

### 7.3 Marketing consent (email offers/promotions)
**Requirements**
- Optional opt-in for marketing emails.
- Must be separate from Terms acceptance.
- Must be changeable later in Settings.

**Acceptance criteria**
- Default is opt-out.
- Consent changes are stored with timestamp.
- Marketing opt-out does not block service emails (OTP, receipts, security).

---

### 7.4 Connect: start/join voice sessions
**Requirements**
- Start session:
  - Free/Basic: 2-person
  - Premium: up to 15; may start from a Team
- Join session only by invite link/QR.
- User must perform explicit **Accept & Join** each time.

**Acceptance criteria**
- Session join is blocked if capacity exceeded.
- Session join is blocked if Free minutes exhausted.
- Users see “Session expired/full” states with clear messaging.

---

### 7.5 Invites (link + QR)
**Requirements**
- Generate invite link for sessions and teams.
- Show QR code for the same link.
- Links must be unguessable tokens.

**Acceptance criteria**
- Link opens an “Invite” screen with details and Accept button.
- QR opens the same flow.
- Expired link shows “Expired” and does not connect.

---

### 7.6 In-call controls
**Requirements**
- Mute self
- Volume +/- (local)
- Participant list
- Group text chat (to active group)
- Handle phone call interruptions by pausing and showing status

**Acceptance criteria**
- Mute affects outgoing mic.
- Volume changes playback.
- Participant list updates when users join/leave.
- Interruption state is visible.

---

### 7.7 Session lifecycle and 24-hour inactivity rule
**Requirement**
- A voice session is treated as inactive if there is no activity.
- After **24 hours of inactivity**, the session expires and cannot be rejoined.
- To connect again, a **new session** must be started and all members must Accept again.

**Acceptance criteria**
- Old invite links expire after inactivity timeout.
- Attempt to join an expired session shows a clear message.

---

### 7.8 Teams (Premium)
**Requirements**
- Premium owner can create up to 5 Teams.
- Each Team can have up to 15 members.
- Team invite via link/QR.
- Team rename.

**Acceptance criteria**
- Prevent creating 6th team.
- Prevent adding 16th member.
- Accepting team invite auto-adds member if capacity exists.
- Rename persists.

---

### 7.9 Teams: “Active in team” (24-hour active choice)
**Requirements**
- Each Team member has an **active status** that expires after 24 hours.
- Members must make an explicit choice to remain active.
- On accepting a Team invite, member starts **Active for 24 hours**.

**Visibility rules**
- All Team members can see the list of **Active members** (name + avatar only).
- Only the **Premium Team owner** can see the full roster (active + inactive).

**Acceptance criteria**
- Member shows Active until timestamp; after expiry becomes inactive.
- Member can tap “Activate for 24 hours” to become active again.
- Non-owners cannot view inactive roster.
- Owner can view both sections.

---

### 7.10 Friends: Favorites + Waitlist (Premium)
**Requirements**
- Premium user can:
  - add favorites
  - delete favorites
  - view waitlist
  - manually promote waitlisted users after deleting a favorite
- Limits:
  - max 15 favorites
  - waitlist beyond 15

**Acceptance criteria**
- Adding a 16th favorite places user in waitlist.
- Deleting a favorite allows promoting from waitlist.
- UI clearly distinguishes favorites vs waitlist.

---

### 7.11 Friends: Recent participants (30 days)
**Requirements**
- Keep “Recent” list for 30 days.

**Acceptance criteria**
- Participants appear after a session.
- Entries older than 30 days are removed/hidden.

---

## 8. Data model (conceptual)

### 8.1 Core entities
- `profiles` (display name, avatar, use-case, language, theme, marketing consent)
- `teams` (owner, name)
- `team_members` (team_id, user_id, active_until)
- `favorites` (owner_id, target_user_id, status: favorite|waitlisted)
- `recents` (owner_id, target_user_id, last_seen_at)
- `sessions` (owner_id, team_id nullable, status, last_activity_at)
- `session_participants` (session_id, user_id, joined_at, left_at)
- `invites` (type: session|team, token, target_id, expires_at)
- `free_usage` (user_id, seconds_used)

### 8.2 Security
- RLS must prevent:
  - viewing other users’ private data
  - listing team rosters for non-owners beyond “active now”
  - guessing invites

---

## 9. App Store requirements (high-risk checklist)
- Subscription screen includes:
  - pricing, duration, benefits
  - restore purchases
  - privacy policy + terms links
- In-app account deletion available.
- Proper permission strings for microphone and Bluetooth.
- No misleading “select subscription” UI; tiers reflect purchase state.

---

## 10. GDPR requirements
- Data minimization:
  - no phone numbers stored
  - no contact book access
- Explicit marketing consent (opt-in).
- Right to deletion:
  - delete account removes associated records.
- Privacy policy lists subprocessors:
  - Supabase
  - RevenueCat
  - Voice/SFU provider
- Retention:
  - Recents retained 30 days
  - Define retention for session metadata

---

## 11. Open implementation decisions (to choose before coding)
- Which hosted SFU provider to use for V1.
- Whether group chat persists after session ends or is ephemeral.

---

## 12. Milestones (recommended)
- **M1:** Design system + navigation + localization scaffolding
- **M2:** Email OTP auth + profile/settings
- **M3:** RevenueCat subscriptions + paywall + restore
- **M4:** Voice sessions + invites link/QR + in-call controls
- **M5:** Teams + active status + visibility rules
- **M6:** Favorites + waitlist + recents retention
- **M7:** App Store/GDPR readiness pass + submission checklist
