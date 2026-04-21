# demiculus.com — project rules

Personal essay site for Demi Yilmaz (cofounder of Colonist.io). Jekyll-based, hosted at demiculus.com. Essays are short, lean, contrarian — treat every sentence as a tax on the reader's attention.

## Stack & local dev

- **Jekyll** site. Run locally with `preview_start` on the `jekyll` config (not `bundle exec` in Bash).
- **Dev URL is `http://localhost:4000`** — plain HTTP. `https://` will fail. Jekyll does not serve HTTPS locally.
- **`_config.yml` changes require a server restart.** Jekyll does NOT hot-reload config. Use `preview_stop` + `preview_start` after editing it. Content/CSS changes do hot-reload.
- **CSS is cache-busted** via `?v={{ site.time | date: '%s' }}` in `_includes/head.html`. Don't undo this.
- Essays live as `.md` files at repo root (not `_posts/`). Pretty permalinks: a file at `foo.md` serves at `/foo/`.
- `_data/writing.yml` is the source of truth for essay ordering on the home page (Recent Essays list). Slug must match the `.md` filename.

## Essay lifecycle

### Adding an essay
1. Create `<slug>.md` at repo root with front matter:
   ```yaml
   ---
   layout: default
   title: <Title>
   description: <One short sentence.>
   created: YYYY-MM-DD
   updated: YYYY-MM-DD
   ---
   ```
2. Add entry to `_data/writing.yml` (slug + title, for home-page ordering).
3. Home page auto-limits to the first 6 entries in `_data/writing.yml` — reorder that file to feature different essays.

### Removing an essay
Two touch points, both required:
1. `rm <slug>.md`
2. Remove the `- slug: <slug>` block from `_data/writing.yml`

Verify with `curl -I http://localhost:4000/<slug>/` → 404.

### Dates
Pull `created` / `updated` from git:
```sh
git log --follow --format='%ai' -- <slug>.md | tail -1  # created
git log --follow --format='%ai' -- <slug>.md | head -1  # updated
```
Dates render via `_layouts/default.html` when front matter has `created:` and/or `updated:`.

## Writing-page plumbing

- `/writing/` (writing.md) iterates `site.pages` and filters by `p.description` — any page with a description in its front matter is an essay.
- Home (index.md) iterates `_data/writing.yml` with `limit: 6`.
- Read More (`_includes/related.html`) shows 3 random related essays under each essay.
- All three views share the same description field — change it in one place and verify all three.

## Copy style

- **Descriptions are one short sentence.** Ideally under 12 words. Sentence case, not Title Case.
- **Offer 3–5 alternatives when proposing copy.** The user iterates on wording and picks one. Don't commit a single option unless asked.
- **Match the site's voice:** direct, contrarian, no hedging, no "I think", no "maybe." Examples:
  - Good: "Five sentences beat a hundred."
  - Good: "Remote isn't freedom. It's a different discipline."
  - Good: "Written rules are the decoy. The real ones stay hidden."
- **Avoid filler words.** "Actually", "really", "just", "basically" — cut them.
- **Never use em-dashes** unless the user asked. (Check the site — they're used sparingly.)

## Links & socials

- External socials block lives in `_includes/identity.html` (home only).
- Current socials: X, Instagram, GitHub, LinkedIn, Goodreads, RSS. Do not add others without asking.
- **Contact links use `mailto:` wrapped in `onclick="return confirm(...)"`** in both `_includes/topbar.html` and `_includes/footer.html`. Preserve the confirm dialog — it's intentional friction to prevent accidental mail-app launches.
- **Email address:** `demirbyilmaz@gmail.com` (not demiculus@).

## Content rules

- **No horizontal rules (`---`) inside essay bodies.** They render as `<hr>` and look out of place. Section breaks use `###` headings instead.
- **Don't commit emojis** to any markdown, HTML, or CSS file.
- **Games section in about.md is sorted newest-first.** Add new entries at the top, not the bottom.

## Verification

After any UI change, verify via `preview_*` tools (not manual browser). Specifically:
1. `preview_eval` to fetch the rendered HTML or query computed styles.
2. `preview_screenshot` for visual confirmation.
3. `preview_snapshot` for text/structure checks.

Remember: if computed styles don't match the CSS file, it's browser caching. Force-reload with the `?v=` query string or hard-reload.

## Essay metadata conventions (post-migration)

- `description`, `created`, `updated` live in each essay's front matter — not in `_data/writing.yml`.
- `_data/writing.yml` holds only slug+title, solely for home-page ordering (first 6 shown).
- `_layouts/default.html` renders `Created ... · Updated ...` automatically when the fields are present.
- Filter `where_exp: "p", "p.description"` is the "is this an essay?" predicate. Pages without a description are not essays and don't appear on `/writing/`, the home list, or "Read more."
- If you add a non-essay page, do NOT give it a `description:` in front matter (or it'll show up in essay lists).
