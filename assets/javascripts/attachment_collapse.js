(function () {
  function teardown(container) {
    var state = container._jnFileState;
    if (!state) return;

    if (state.summary.parentNode) state.summary.parentNode.removeChild(state.summary);
    if (state.filterInput && state.filterInput.parentNode) state.filterInput.parentNode.removeChild(state.filterInput);
    container.classList.remove('jn-file-navigator-mode');
    container.hidden = false;
    Array.prototype.slice.call(container.querySelectorAll('tr')).forEach(function (tr) { tr.hidden = false; });
    container._jnFileState = null;
  }

  function buildFilter(container, rows, opts) {
    var input = document.createElement('input');
    input.type = 'search';
    input.className = 'jn-file-filter';
    input.placeholder = opts.filterPlaceholder || '';

    input.addEventListener('input', function () {
      var term = input.value.trim().toLowerCase();
      rows.forEach(function (tr) {
        tr.hidden = term !== '' && tr.textContent.toLowerCase().indexOf(term) === -1;
      });
    });

    container.parentNode.insertBefore(input, container);
    return input;
  }

  function applyOne(container, opts) {
    teardown(container);
    if (!opts.enabled) return;

    var rows = Array.prototype.slice.call(container.querySelectorAll('table tr'));
    if (rows.length === 0) return;

    var summary = document.createElement('button');
    summary.type = 'button';
    summary.className = 'jn-file-summary icon icon-attachment';
    summary.textContent = container.dataset.jnSummary || '';
    summary.setAttribute('aria-expanded', 'false');

    var state = { summary: summary, filterInput: null };
    var expanded = false;

    summary.addEventListener('click', function () {
      expanded = !expanded;
      container.hidden = !expanded;
      summary.setAttribute('aria-expanded', String(expanded));
      summary.classList.toggle('jn-file-summary-open', expanded);

      if (expanded && opts.navigatorEnabled) {
        container.classList.add('jn-file-navigator-mode');
        if (!state.filterInput && rows.length > 6) {
          state.filterInput = buildFilter(container, rows, opts);
        }
        if (state.filterInput) state.filterInput.hidden = false;
      } else {
        container.classList.remove('jn-file-navigator-mode');
        if (state.filterInput) state.filterInput.hidden = true;
      }
    });

    container.parentNode.insertBefore(summary, container);
    container.hidden = true;
    container._jnFileState = state;
  }

  function apply(rootEl, opts) {
    if (!rootEl) return;

    var containers = Array.prototype.slice.call(rootEl.querySelectorAll('.attachments'));
    containers.forEach(function (container) { applyOne(container, opts); });
  }

  window.RedmineAttachmentCollapse = { apply: apply };
})();
