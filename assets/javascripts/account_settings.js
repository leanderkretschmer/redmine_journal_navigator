document.addEventListener('DOMContentLoaded', function () {
  var root = document.getElementById('jn-account-settings');
  if (!root) return;

  var fields = {
    collapseEnabled: document.getElementById('jn-collapse-enabled'),
    collapseLines: document.getElementById('jn-collapse-lines'),
    collapseLinesValue: document.getElementById('jn-collapse-lines-value'),
    autohideEnabled: document.getElementById('jn-collapse-autohide-enabled'),
    autohideDistance: document.getElementById('jn-collapse-autohide-distance'),
    autohideDistanceValue: document.getElementById('jn-collapse-autohide-distance-value'),
    filelistEnabled: document.getElementById('jn-filelist-enabled'),
    navigatorEnabled: document.getElementById('jn-filelist-navigator-enabled')
  };

  var previewHistory = document.getElementById('jn-preview-history');
  var previewAttachments = document.getElementById('jn-preview-attachments');
  var status = document.getElementById('jn-save-status');
  var token = (document.querySelector('meta[name=csrf-token]') || {}).content || '';

  var labels = {
    expand: root.dataset.expandLabel,
    collapse: root.dataset.collapseLabel
  };
  var filterPlaceholder = root.dataset.filterPlaceholder;

  function renderPreview() {
    fields.collapseLinesValue.textContent = fields.collapseLines.value;
    fields.autohideDistanceValue.textContent = fields.autohideDistance.value;

    if (window.RedmineJournalCollapse && previewHistory) {
      window.RedmineJournalCollapse.apply(previewHistory, {
        enabled: fields.collapseEnabled.checked,
        previewLines: parseInt(fields.collapseLines.value, 10),
        autohideEnabled: fields.autohideEnabled.checked,
        autohideDistance: parseInt(fields.autohideDistance.value, 10),
        labels: labels
      });
    }

    if (window.RedmineAttachmentCollapse && previewAttachments) {
      window.RedmineAttachmentCollapse.apply(previewAttachments.parentNode, {
        enabled: fields.filelistEnabled.checked,
        navigatorEnabled: fields.navigatorEnabled.checked,
        filterPlaceholder: filterPlaceholder
      });
    }
  }

  var saveTimeout = null;
  function scheduleSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(save, 400);
  }

  function save() {
    var body = [
      'collapse_enabled=' + (fields.collapseEnabled.checked ? '1' : '0'),
      'collapse_lines=' + encodeURIComponent(fields.collapseLines.value),
      'collapse_autohide_enabled=' + (fields.autohideEnabled.checked ? '1' : '0'),
      'collapse_autohide_distance=' + encodeURIComponent(fields.autohideDistance.value),
      'filelist_enabled=' + (fields.filelistEnabled.checked ? '1' : '0'),
      'filelist_navigator_enabled=' + (fields.navigatorEnabled.checked ? '1' : '0')
    ].join('&');

    fetch('/journal_navigator/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-Token': token
      },
      body: body
    }).then(function (response) {
      if (status) status.textContent = response.ok ? '✓' : '✗';
    }).catch(function () {
      if (status) status.textContent = '✗';
    });
  }

  Object.keys(fields).forEach(function (key) {
    var el = fields[key];
    if (!el || el.tagName !== 'INPUT') return;

    el.addEventListener('input', function () {
      renderPreview();
      scheduleSave();
    });
  });

  renderPreview();
});
