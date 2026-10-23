(function () {
  // Extra lines of tolerance: a comment that only slightly exceeds the configured
  // preview length is left alone instead of being collapsed for little visual gain.
  // Scales with the configured preview length (~30%, at least 2 lines) rather than
  // a flat value, so a small preview setting doesn't end up with a huge relative
  // tolerance that makes the feature feel like it does nothing.
  function marginLinesFor(previewLines) {
    return Math.max(2, Math.round(previewLines * 0.3));
  }

  // Finds the actual background color the fade should blend into, so it
  // still looks right on journals that redmine_alternating_journals (or any
  // other plugin) tints with a non-white background, instead of always
  // fading to a hardcoded white that leaves a visible seam on those.
  function ambientBackgroundColor(el) {
    var node = el;
    while (node && node !== document.body) {
      var bg = window.getComputedStyle(node).backgroundColor;
      var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(bg);
      if (m && (m[4] === undefined || parseFloat(m[4]) > 0)) {
        return { r: m[1], g: m[2], b: m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
      }
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 0.95 };
  }

  function fadeGradientFor(el) {
    var c = ambientBackgroundColor(el);
    var transparentStop = 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', 0)';
    var solidStop = 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a + ')';
    return 'linear-gradient(to bottom, ' + transparentStop + ', ' + solidStop + ')';
  }

  // This script runs synchronously while the page is still being parsed, so
  // a plain setTimeout(fn, 0) called from here fires *before* DOMContentLoaded
  // -- too early to see classes/styles other plugins (e.g.
  // redmine_alternating_journals) apply from their own DOMContentLoaded
  // handler. Wait for that event first (if it hasn't fired yet), then defer
  // one more tick so handlers registered after ours have also run.
  function whenPageSettled(fn) {
    function runSoon() { setTimeout(fn, 0); }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runSoon, { once: true });
    } else {
      runSoon();
    }
  }

  function lineHeightOf(el) {
    var cs = window.getComputedStyle(el);
    var lh = parseFloat(cs.lineHeight);
    if (!lh || isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.4;
    return lh;
  }

  // keeps whatever the user is looking at under the cursor/toggle in place while
  // the DOM above or around it changes height, instead of letting the page jump
  function scrollSafe(anchorEl, mutate) {
    var before = anchorEl.getBoundingClientRect().top;
    mutate();
    var after = anchorEl.getBoundingClientRect().top;
    var delta = after - before;
    if (delta !== 0) window.scrollBy(0, delta);
  }

  // the actual visual state change, with no scroll side-effect of its own
  function setCollapsedState(note, state, collapsed) {
    if (collapsed) {
      note.style.maxHeight = state.collapsedHeight + 'px';
      note.style.overflow = 'hidden';
      note.classList.add('jn-collapsed');
      state.fade.hidden = false;
      state.toggle.textContent = state.labels.expand;
      state.toggle.setAttribute('aria-expanded', 'false');
    } else {
      note.style.maxHeight = '';
      note.style.overflow = '';
      note.classList.remove('jn-collapsed');
      state.fade.hidden = true;
      state.toggle.textContent = state.labels.collapse;
      state.toggle.setAttribute('aria-expanded', 'true');
    }
    state.collapsed = collapsed;
  }

  // same, but compensates the scroll position for the height change -- use this
  // for anything that happens *after* the page has settled (clicks, auto-recollapse)
  function setCollapsed(note, state, collapsed) {
    scrollSafe(state.toggle, function () {
      setCollapsedState(note, state, collapsed);
    });
  }

  function teardown(note) {
    var state = note._jnCollapseState;
    if (!state) return;

    note.classList.remove('jn-collapsed', 'jn-expandable');
    note.style.maxHeight = '';
    note.style.overflow = '';
    if (state.fade.parentNode) state.fade.parentNode.removeChild(state.fade);
    if (state.toggle.parentNode) state.toggle.parentNode.removeChild(state.toggle);
    note.removeEventListener('click', state.clickHandler);
    note._jnCollapseState = null;
  }

  function applyOne(note, opts) {
    teardown(note);

    var lh = lineHeightOf(note);
    var collapsedHeight = opts.previewLines * lh;
    var marginHeight = marginLinesFor(opts.previewLines) * lh;

    if (note.scrollHeight <= collapsedHeight + marginHeight) return;

    var fade = document.createElement('div');
    fade.className = 'jn-collapse-fade';
    fade.style.background = fadeGradientFor(note.parentNode);
    // Plugins like redmine_alternating_journals apply their background color
    // from their own DOMContentLoaded handler, which runs after this script
    // (a plain synchronous <script> near the end of body). Re-sample once
    // more shortly after so the fade still picks up that color once it's
    // actually there, without delaying the collapse itself.
    whenPageSettled(function () { fade.style.background = fadeGradientFor(note.parentNode); });

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'jn-collapse-toggle';

    var container = note.parentNode;
    container.insertBefore(fade, note.nextSibling);
    container.insertBefore(toggle, fade.nextSibling);
    note.classList.add('jn-expandable');

    var state = {
      collapsedHeight: collapsedHeight,
      fade: fade,
      toggle: toggle,
      labels: opts.labels,
      collapsed: true
    };
    note._jnCollapseState = state;

    toggle.addEventListener('click', function () {
      setCollapsed(note, state, !state.collapsed);
    });

    state.clickHandler = function (event) {
      if (!state.collapsed) return;
      if (event.target.closest('a, img, button')) return;
      if (window.getSelection && String(window.getSelection())) return;
      setCollapsed(note, state, false);
    };
    note.addEventListener('click', state.clickHandler);

    // initial setup, not a user action -> no scroll compensation needed
    setCollapsedState(note, state, true);
  }

  function initAutoRecollapse(allNotes, opts) {
    if (allNotes.length === 0 || !window.IntersectionObserver) return null;

    var currentIndex = 0;

    function recheck() {
      allNotes.forEach(function (note, idx) {
        var state = note._jnCollapseState;
        if (!state || state.collapsed) return;
        if (Math.abs(idx - currentIndex) > opts.autohideDistance) {
          setCollapsed(note, state, true);
        }
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; });
      if (visible.length === 0) return;

      visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      var idx = allNotes.indexOf(visible[0].target);
      if (idx !== -1) {
        currentIndex = idx;
        recheck();
      }
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

    allNotes.forEach(function (note) { observer.observe(note); });
    return observer;
  }

  function apply(rootEl, opts) {
    if (!rootEl) return;

    if (rootEl._jnObserver) {
      rootEl._jnObserver.disconnect();
      rootEl._jnObserver = null;
    }

    // Match the note content div by its id pattern (journal-<id>-notes), not the
    // "journal-note" class: some Redmine builds/themes (confirmed on production)
    // render this div as plain class="wiki" without that extra class.
    var allNotes = Array.prototype.slice.call(
      rootEl.querySelectorAll('.journal.has-notes [id^="journal-"][id$="-notes"].wiki')
    );

    allNotes.forEach(function (note) { teardown(note); });
    if (!opts.enabled) return;

    allNotes.forEach(function (note) { applyOne(note, opts); });

    if (opts.autohideEnabled) {
      rootEl._jnObserver = initAutoRecollapse(allNotes, opts);
    }
  }

  function expandIfCollapsed(note) {
    if (!note) return;
    var state = note._jnCollapseState;
    if (state && state.collapsed) setCollapsed(note, state, false);
  }

  window.RedmineJournalCollapse = { apply: apply, expandIfCollapsed: expandIfCollapsed };
})();
