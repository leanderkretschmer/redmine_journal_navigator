(function () {
  var box = document.getElementById('journal-navigator');
  if (!box) return;

  var historyEl = document.getElementById('history');
  if (!historyEl) return;

  function collectNotes() {
    // only journals that actually have a comment (.has-notes), not plain property changes
    var nodes = historyEl.querySelectorAll('.journal.has-notes .note[id^="note-"]');
    return Array.prototype.slice.call(nodes).sort(function (a, b) {
      return parseInt(a.id.slice(5), 10) - parseInt(b.id.slice(5), 10);
    });
  }

  var notes = collectNotes();
  if (notes.length === 0) {
    box.style.display = 'none';
    return;
  }

  var prevBtn = document.getElementById('journal-nav-prev');
  var nextBtn = document.getElementById('journal-nav-next');
  var slider = document.getElementById('journal-nav-slider');
  var position = document.getElementById('journal-nav-position');

  slider.max = notes.length - 1;

  var current = 0;
  var suppressObserver = false;
  var suppressTimeout = null;

  function updateUI() {
    position.textContent = (current + 1) + ' / ' + notes.length;
    slider.value = current;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === notes.length - 1;
  }

  function goTo(index, instant) {
    index = Math.max(0, Math.min(notes.length - 1, index));
    current = index;
    updateUI();

    suppressObserver = true;
    notes[current].scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });

    clearTimeout(suppressTimeout);
    suppressTimeout = setTimeout(function () { suppressObserver = false; }, 500);
  }

  prevBtn.addEventListener('click', function () { goTo(current - 1); });
  nextBtn.addEventListener('click', function () { goTo(current + 1); });

  // 'input' fires continuously while dragging -> fast, non-smooth scrolling while sliding
  slider.addEventListener('input', function () {
    goTo(parseInt(slider.value, 10), true);
  });

  // keep the navigator in sync when the user scrolls the page manually
  if (window.IntersectionObserver) {
    var observer = new IntersectionObserver(function (entries) {
      if (suppressObserver) return;

      var visible = entries.filter(function (entry) { return entry.isIntersecting; });
      if (visible.length === 0) return;

      visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      var index = notes.indexOf(visible[0].target);
      if (index !== -1 && index !== current) {
        current = index;
        updateUI();
      }
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

    notes.forEach(function (note) { observer.observe(note); });
  }

  // if the page was opened with a #note-N anchor, start the navigator there
  var hashMatch = /^#?note-(\d+)$/.exec(window.location.hash);
  if (hashMatch) {
    var index = notes.findIndex(function (note) { return note.id === 'note-' + hashMatch[1]; });
    if (index !== -1) current = index;
  }

  updateUI();
})();
