# ProVisionI UI3 Customizations & Reintegration Guide

This fork (`github.com/JD2005L/ui3`) carries ProVisionI-specific customizations on top of
stock UI3. This document is the **playbook for re-applying them after a Blue Iris update**
overwrites the shipped UI3 files.

> Keep this file up to date whenever a customization is added, changed, or removed.

---

## 1. Why this exists

A Blue Iris update extracts a fresh upstream UI3 release into each VM's `www` directory and
**overwrites the shipped files** — `ui3.htm`, `ui3/ui3.js`, `ui3/ui3.css`. Our customizations
live *inside those exact files*, so a BI update reverts them on the VM until we redeploy.

**Important:** do **not** just copy this old fork over a *newer* BI's UI3 — UI3 is meant to
match the BI version it ships with, so pinning an old fork against a newer BI risks broken
features. The correct response to a BI update is **merge upstream → re-apply → re-verify** (§3).

### What survives a BI update (and what doesn't)

| File | Overwritten by a BI/UI3 update? |
|------|--------------------------------|
| `ui3.htm`, `ui3/ui3.js`, `ui3/ui3.css` | **Yes** — these are shipped by UI3 |
| `ui3/ui3-local-overrides.js` / `.css` | **No** — UI3 releases don't contain them, so they aren't clobbered |

This asymmetry is the basis of the future-proofing recommendation in §7.

---

## 2. Baseline

- **Stock baseline commit:** `3f4e925` (last upstream commit; UI3 **version 318**). Everything
  after it on `master` is ProVisionI customization.
- **Customization commits (oldest→newest):**
  - `3fa4fc7` — local-overrides: lock maximize for URL-maximized loads (the in-map PiP)
  - `9044907` — kiosk UI: orange theme, top-bar Group/Quality, hidden side bar, zoom/maximize fixes
  - `342596c` — grid-zoom: visible top-bar toggle button
  - `7207652` — grid-zoom off: forward wheel scroll to the parent page (iframe)
  - `ab0a761` — restore clip download/export: Clips tab back, side bar only on Clips
- **See the full cumulative diff any time with:** `git diff 3f4e925..HEAD`

---

## 3. Reintegration procedure (after a BI update ships a newer UI3)

**Preferred — git merge (keeps our changes *and* upstream's improvements):**
1. Add upstream once: `git remote add upstream https://github.com/bp2008/ui3` (skip if already added).
2. `git fetch upstream` and identify the new release tag/commit matching the new BI version.
3. `git merge upstream/master` (or the release tag). Resolve conflicts using the per-item
   details in §5 — most of our edits are localized.
4. Work through the **verification checklist** in §6.
5. **Bump `ui_version`** in `ui3.htm` (see §4), commit, deploy, hard-refresh.

**Fallback — manual re-apply** (if a merge is too messy): start from the new stock UI3 and
re-apply each item in §5 by hand, then do §4 and §6.

---

## 4. Always do on deploy: bump `ui_version` (cache-busting)

`ui3.htm` has `var ui_version = "318";`. `combined_version` = `ui_version + "-" + bi_version`,
which is the `?v=` cache-buster on `ui3.js`/`ui3.css`. **If `ui_version` isn't bumped, browsers
serve the cached old JS/CSS even after new files land on the VM** — this is the recurring "had to
refresh to see changes" symptom. Bump it on every rollout.

---

## 5. Detailed change inventory

Each item: **what / why / exact change / how to re-apply / conflict risk.**

### 5.1 `ui3.htm` — top bar

**(a) Removed the 4 clip-shortcut icons** *(risk: low)*
Removed `#open_all_clips_btn`, `#open_alerts_btn`, `#open_alerts_canceled_btn`,
`#open_alerts_confirmed_btn` (the four `topbar_icon` divs that sat right after `<a id="topbar_gap">`).
*Why:* they feed the (now Clips-only) side bar and cluttered the kiosk top bar.
*Re-apply:* delete those four `<div id="open_*">` lines from the `#layouttop` block.

**(b) Added Group + Quality top-bar dropdowns** *(risk: medium if upstream restructures the top bar)*
Inserted after the Timeline tab, before `topbar_gap`:
```html
<div class="topbarDropdown dropdownBox" name="currentGroup" title="Current Group / Cameras"><span class="topbarDropdownPrefix">Group</span></div>
<div class="topbarDropdown dropdownBox" name="streamingQuality" title="Streaming Quality"><span class="topbarDropdownPrefix">Quality</span></div>
```
*Why:* relocate the two dropdowns operators need out of the (hidden) side bar. They work with no
JS wiring — UI3's `DropdownBoxes()` binds any `.dropdownBox[name=...]` and supports multiple
triggers per name. Styled by §5.4(b).
*Re-apply:* re-insert these two lines; confirm `DropdownBoxes()` still binds `.dropdownBox`.

**(c) Added the Grid Zoom top-bar button** *(risk: low)*
Inserted after `topbar_gap`, before `#save_snapshot_btn`:
```html
<div id="gridZoomToggleBtn" class="topbar_icon icon" onclick="toggleGridZoom()" title="Grid Zoom"><svg class="icon noflip"><use xlink:href="#svg_mio_zoom_in_crop"></use></svg></div>
```
*Why:* visible on/off toggle for grid-view digital zoom (§5.3c). Needs the JS in §5.3(b) and CSS
in §5.4(c).

### 5.2 `ui3.htm` — playback controls (bottom bar)

**Removed 4 buttons from `#pcButtonContainer`** *(risk: low)*
Removed `#clipFullscreenButton`, `#clipPictureInPictureButton`, `#playbackSettingsButton`,
`#prioritizeTriggeredButton`. **Kept** `#clipExitFullscreenButton`, `#clipMaximizeButton`,
`#clipExitMaximizeButton`, and the clip `#clipExportButton` / `#clipDownloadButton` / flag / delete.
*Why:* trim the bottom-right control cluster for the kiosk.
*Re-apply:* delete those four lines. All JS references to them are null-safe (jQuery no-ops), so
removal can't throw. Fullscreen is still reachable by double-click/hotkey; the exit-fullscreen
button is intentionally kept as an escape hatch.

### 5.3 `ui3/ui3.js` — settings (in `defaultSettings`)

> **Generation note:** the `Generation: N` fields exist only to force *already-deployed browsers*
> to reset a setting whose default we changed (UI3 only re-applies a default when the stored
> `ui3_gen_<key>` is lower). On a clean re-apply against fresh upstream you can set the *values*
> directly and **drop the Generation lines** (or renumber from 1) — they're transitional, not
> behavioral.

| Setting | Stock | Ours | Why |
|---------|-------|------|-----|
| `ui3_sidebar_visible_on_live` | `"1"` | `"0"` (Gen 1) | Hide side bar on Live |
| `ui3_sidebar_visible_on_clips` | `"1"` | `"1"` (Gen 2) | **Net = stock.** Value unchanged; Gen 2 only undoes an interim `"0"` we shipped. On a clean re-apply this item can be **omitted entirely**. |
| `ui3_show_sidebar_hidden_button` | `"1"` | `"0"` (Gen 1) | No reveal-arrow by the system name |
| `ui3_status_area_show_timeline` | `"1"` | `"0"` (Gen 1) | Hide the Server Status box on Timeline → full-width timeline |
| `ui3_zoomOnGroupView` | *(new)* | `"0"` | New setting backing the Grid Zoom toggle; default off (no zoom on the grid) |

*Re-apply:* set the three values to `"0"`, add the new `ui3_zoomOnGroupView` bare setting, and skip
the clips one. Net behavior: side bar hidden on Live & Timeline, **present only on the Clips tab**
(so operators can browse/download/export — see §5.5 background).

### 5.4 `ui3/ui3.js` — behavior / logic

**(a) Maximize-exit side-bar fix** *(risk: higher — core function)* — in
`MaximizedModeController.loadMaximizeState()`. Changed the un-maximize branch from
`$("#layoutleft,#layouttop").show();` to:
```js
$("#layouttop").show();
$("#layoutleft").css("display", "");   // let .disabledBySetting / HandleSidebarVisibilityChange govern
```
*Why:* jQuery `.show()` writes an inline `display` that overrides the `.disabledBySetting`
rule, so the hidden side bar wrongly reappeared after exiting maximize/full screen until reload.
*Re-apply:* find the `loadMaximizeState` else-branch and apply the same split. If upstream rewrote
this function, re-derive the intent: **never force `#layoutleft` visible — clear its inline display
and let the CSS class decide.**

**(b) Grid-zoom + parent-scroll functions** *(risk: low — additive)* — three top-level functions
added just before `function SidebarHiddenButtonClick`:
- `ForwardWheelToParent(e)` — forwards wheel scroll to the host page (same-origin → `window.parent.scrollBy`; cross-origin → `postMessage({type:"ui3.scrollParent",…})`, which needs a parent-side listener; see §8).
- `toggleGridZoom()` — flips `settings.ui3_zoomOnGroupView`, calls the updater.
- `UpdateGridZoomToggleButton()` — sets the `.gridZoomActive` class + state-describing title on `#gridZoomToggleBtn`.
Plus an init call `UpdateGridZoomToggleButton();` added in the main `$(function(){…})` block among the `OnChange_*` calls.
*Re-apply:* paste the three functions back; re-add the init call. (Verbatim in `git show 7207652`/`342596c`.)

**(c) Grid-zoom gate in the two zoom entry points** *(risk: higher — sits inside core handlers)* —
in `ImageRenderer`:
- `$layoutbody.on('wheel', …)` — at the top, before the existing zoom logic:
```js
if (settings.ui3_zoomOnGroupView !== "1" && videoPlayer.Loading().image.isGroup) {
    if (ForwardWheelToParent(e)) e.preventDefault();
    return;
}
```
- `onPinchStart(e)` — same guard (without the forwarding), `return` early.
*Why:* digital zoom on the multi-camera grid is awkward; gate it behind the toggle, and forward the
wheel to the host page when not zooming. Single-camera zoom is unaffected (`isGroup` is false).
*Re-apply:* re-insert both guards. The discriminator is `videoPlayer.Loading().image.isGroup`
(true on group/grid, false on a single camera). If upstream changed the wheel/pinch handlers,
place the guard at the very start of each.

### 5.5 `ui3/ui3.css`

**(a) Theme recolor: purple → orange** *(risk: medium — re-map if upstream changes theme vars)* —
in the default `:root` theme (this is the "Blue Iris 6"/Auto theme; BI5/Legacy override these and
are unaffected). The stock theme is built on hue **245** (purple); we shifted the brand family to
orange (hue ~**28–32**) and moved two purple-*blue* secondary accents to a true blue (hue **208**).

Orange (brand): `--main-highlight-color` `hsl(28,90%,48%)`; `--seek-bar-color` `hsl(32,95%,62%)`;
`--progress-bar-inner-color` `hsl(30,90%,54%)`; `--status-bar-inner-color` `hsl(28,88%,50%)`;
`--system-name-bg-color` `hsl(28,85%,37%)`; `--dialog-border-color` `hsl(28,65%,28%)`;
`--dialog-titlebar-bg-color` `hsl(28,80%,34%)`; `--dialog-titlebar-bottom-border-color` `hsl(28,80%,18%)`;
`--collapsible-heading-expanded-{bg,hover,active}` `hsl(28,80%,34%)/(28,85%,44%)/(28,90%,52%)`;
`--datetile-bg-color` `hsl(28,45%,27%)`; `--badge-hover-color` `hsl(30,95%,62%)`;
`--timeline-legend-bg-color` `hsl(28,50%,24%)`; `--context-menu-icon-highlight-color` `hsl(28,92%,52%)`.
True blue (secondary): `--dropdown-item-blue-{color,hover,active}` `hsl(208,80%,66%)/(208,85%,74%)/(208,90%,82%)`;
`--dialog-link-color` `#7ec0ff`.
*Re-apply:* in the new `:root`, replace each of the above purple values. Rule of thumb: any
`hsl(245,…)` brand value → same S/L at the orange hue listed; the "blue" dropdown + dialog-link →
the true-blue values. *Why true blue, not orange, for those:* keeps them distinct from the orange
brand and the existing golden/red menu categories.

**(b) `.topbarDropdown` styles** *(risk: low — additive)* — block added after the
`.sizeSmall #systemname, .sizeSmall .topbar_tab_label` rule. Styles the §5.1(b) dropdowns to fit
the top bar (height 64/52/40 by size, prefix label, arrow). Re-apply: paste the block (verbatim in
`git show 9044907 -- ui3/ui3.css`).

**(c) `#gridZoomToggleBtn` styles** *(risk: low — additive)* — size rules (26/22/18 by size) added
after the `#save_snapshot_btn` rules, plus the on-state:
`#gridZoomToggleBtn.gridZoomActive { color: var(--main-highlight-color); }` (orange when enabled;
the ID beats the generic `.icon` color rules). Re-apply: paste the block.

### 5.6 `ui3/ui3-local-overrides.js` / `.css` — already update-resilient

These two files (commit `3fa4fc7`) lock the portal's in-map camera PiP: `…js` adds the
`pvi-locked-maximize` class to `<html>` when the URL has `?maximize=1`/`?m=1`; `…css` hides
`#clipMaximizeButton`/`#clipExitMaximizeButton` while that class is present.
**These survive BI updates** (UI3 releases don't contain them). They only need re-checking if a
future UI3 renames those button IDs or changes how `?maximize=1` works. No re-apply needed after a
routine update.

---

## 6. Post-reintegration verification checklist

- [ ] **Live:** no side bar; full-width video; top-bar **Group** + **Quality** dropdowns present and working.
- [ ] **Clips tab:** side bar returns with the clip list; selecting a clip shows **Download** + **Export**; both work; leaving Clips hides the side bar again.
- [ ] **Timeline:** no side bar, no Server Status box, full-width timeline.
- [ ] **Theme:** brand is orange (active tab underline, system-name button, timeline header, progress/seek bars); no leftover purple (`grep -n "hsl(245" ui3/ui3.css` → only the comment, if any).
- [ ] **Bottom bar:** Full Screen / PiP / Settings-gear / Auto-Maximize buttons absent; exit-fullscreen + maximize still present.
- [ ] **Grid Zoom button:** visible in the top bar; off by default (gray); scrolling the grid does **not** zoom and scrolls the host page; toggling on (orange) makes the grid zoom; single-camera zoom always works.
- [ ] **Maximize/full screen exit:** side bar does **not** reappear after exiting (no reload needed).
- [ ] **In-map PiP** (`?maximize=1`): maximize/un-maximize buttons hidden (local-overrides still active).
- [ ] `node --check ui3/ui3.js` passes; `ui_version` bumped.

---

## 7. Future-proofing recommendation

Direct edits to `ui3.htm`/`ui3.js`/`ui3.css` are reverted by every BI update. The
`ui3-local-overrides.*` files are **not** — so migrating what we can into them makes those parts
ride through updates with zero re-apply:

- **Portable to local-overrides today:** the theme recolor (§5.5a) and the simpler hide/size CSS →
  `ui3-local-overrides.css`. The settings defaults (§5.3) → `ui3-local-overrides.js` via UI3's
  `OverrideDefaultSetting(key, value, …)` hook (it exists specifically for the overrides file).
- **Stuck as core edits** (hard to do in overrides, will always need a re-check on major updates):
  the wheel/pinch zoom gate + scroll-forwarding (§5.4c/b), the maximize-exit fix (§5.4a), and the
  injected top-bar dropdowns/button DOM (§5.1b/c — injectable from JS but more involved).

Doing the portable migration would shrink the "must re-apply after a BI update" set to just the
handful of core JS behaviors above.

---

## 8. Appendix — cross-origin scroll-forwarding (open item)

`ForwardWheelToParent` (§5.4b) scrolls a same-origin parent directly. If the portal embeds UI3
**cross-origin**, the parent page must add this listener for grid-scroll-over-iframe to reach it:
```html
<script>
window.addEventListener("message", function (e) {
  // Optional: if (e.origin !== "https://YOUR-UI3-ORIGIN") return;
  if (e && e.data && e.data.type === "ui3.scrollParent")
    window.scrollBy(e.data.deltaX || 0, e.data.deltaY || 0);
});
</script>
```
Whether the portal is same- or cross-origin with UI3 was never confirmed; if grid-scroll doesn't
move the host page after deploy, it's cross-origin and needs the snippet above.
