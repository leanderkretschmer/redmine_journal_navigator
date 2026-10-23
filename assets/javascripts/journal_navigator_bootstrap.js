(function () {
  var config = window.RedmineJournalNavigatorConfig;
  if (!config) return;

  var historyEl = document.getElementById('history');
  if (historyEl && window.RedmineJournalCollapse) {
    window.RedmineJournalCollapse.apply(historyEl, {
      enabled: config.collapseEnabled,
      previewLines: config.collapseLines,
      autohideEnabled: config.collapseAutohideEnabled,
      autohideDistance: config.collapseAutohideDistance,
      labels: { expand: config.i18n.expand, collapse: config.i18n.collapse }
    });
  }

  if (window.RedmineAttachmentCollapse) {
    if (config.attachmentSummary) {
      Array.prototype.slice.call(document.querySelectorAll('.attachments')).forEach(function (el) {
        el.dataset.jnSummary = config.attachmentSummary;
      });
    }
    window.RedmineAttachmentCollapse.apply(document, {
      enabled: config.filelistEnabled,
      navigatorEnabled: config.filelistNavigatorEnabled,
      commentFilelistEnabled: config.commentFilelistEnabled,
      filterPlaceholder: config.i18n.filterPlaceholder,
      i18n: {
        pdfPagesOne: config.i18n.pdfPagesOne,
        pdfPagesOther: config.i18n.pdfPagesOther,
        pdfGroupFallback: config.i18n.pdfGroupFallback,
        commentFilesOne: config.i18n.commentFilesOne,
        commentFilesOther: config.i18n.commentFilesOther
      }
    });
  }
})();
