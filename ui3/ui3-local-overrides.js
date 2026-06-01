// ProVisionI local overrides for UI3 (loaded after the main UI3 assets).
//
// Lock the view when UI3 is loaded maximized via the URL (?maximize=1 / ?m=1).
// The ProVisionI portal loads its in-map camera PiP that way: a tiny corner
// overlay showing one camera full-bleed. In that locked overlay we hide UI3's
// maximize / un-maximize toggle so the viewer can't un-maximize it. We mark the
// <html> element so ui3-local-overrides.css can target it (CSS does the hiding,
// which reliably overrides UI3's own show/hide of the button).
(function () {
	try {
		var search = window.location.search || "";
		var m = /[?&](?:maximize|m)=([^&]*)/i.exec(search);
		var value = m ? decodeURIComponent(m[1]).toLowerCase() : "";
		if (value === "1" || value === "true") {
			document.documentElement.classList.add("pvi-locked-maximize");
		}
	} catch (e) {
		/* no-op: never break UI3 over a cosmetic override */
	}
})();
