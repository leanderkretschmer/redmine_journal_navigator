(function () {
  // Extra lines of tolerance: a comment that only slightly exceeds the configured
  // preview length is left alone instead of being collapsed for little visual gain.
  // Scales with the configured preview length (~30%, at least 2 lines) rather than
  // a flat value, so a small preview setting doesn't end up with a huge relative
  // tolerance that makes the feature feel like it does nothing.
  function marginLinesFor(previewLines) {
    return Math.max(2, Math.round(previewLines * 0.3));
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

    var allNotes = Array.prototype.slice.call(
      rootEl.querySelectorAll('.journal.has-notes .wiki.journal-note')
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
