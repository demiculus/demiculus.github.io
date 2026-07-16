# Anime site — needs

Product brief for `/anime/` on demiculus.com.

Last updated: 2026-07-16

---

## One-liner

A public family anime board that helps the four of you decide what to watch next, and lets you share favorites.

---

## Who it's for

| Audience | Role |
|----------|------|
| Demi, Kan, Goku, Orhan | Primary users: next-watch, rate, tag, maintain the list |
| Friends / public visitors | Browse the full tier list (no personal queue) |

---

## Jobs to be done

1. **Decide the next anime to watch** (primary) — for the signed-in viewer
2. **See a general overview** of the family tier list
3. **Share favorites** with people outside the family
4. **Maintain the shared ranking** (add shows, set tiers, keep personal tags)

---

## Homepage (shipped)

**Up next queue** on top of the **existing tier list**.

### Up next

- Exactly **3** shows
- Ranked by high **family average tier** among shows **you have not rated**
- Shown only when **signed in**; hidden when signed out
- Identity from **auth session** — no person switcher
- No reshuffle
- No “Play next” (or any play/queue action) — rows link to IMDb like the board
- Shows poster, title, avg, who rated it and their tier, tags (read-only), your tier select
- Rating a show removes it from the queue (you've now rated it)

### Full board

- Average / per-person view toggles
- Search / filter shows
- Flat ranked list (score rail): avg or person tier, who rated chips, posters, tags, IMDb links
- Add anime + rating/tagging when signed in

---

## Constraints

| Constraint | Decision |
|------------|----------|
| Hosting / URL | Stay on demiculus.com |
| Tags (G/O/K/D chips) | Keep |
| Must keep in UI | Posters, IMDb links, existing list/board |
| Up next length | 3 |
| Reshuffle | No |
| Play next / playback actions | No |
| Person switcher for next-watch | No |
| Roster | Four family members |

---

## Still open

- Better tier-control UX (dropdowns remain a pain)
- How visitors best see / share favorites (beyond the public board)

---

## Success criteria

1. Signed-in member sees a 3-item personal up-next queue without choosing who they are.
2. Same page still has the full ranked list (search, avg/who-rated, tags, links, posters).
3. Visitor can browse the list; queue is hidden when signed out.

---

## Out of scope

- Open sign-up / arbitrary new raters
- Full AniList/MAL sync
- Episode-level tracking
- Manual “view as” person switcher
- Concept prototypes (removed)

---

## Revision log

- 2026-07-16 — First draft from product Q&A.
- 2026-07-16 — Chose B (queue). No person selection; keep existing list.
- 2026-07-16 — Queue = 3 items, no reshuffle; shipped on `/anime/`; prototypes removed.
- 2026-07-16 — Confirmed no Play next; needs doc reflects shipped homepage.
- 2026-07-16 — Board list/tiers prototypes tried and removed.
- 2026-07-16 — Board is flat score-rail list (option B): avg + who-rated chips; tier accordions removed.
