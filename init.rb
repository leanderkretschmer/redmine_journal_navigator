# frozen_string_literal: true

require_relative 'lib/redmine_journal_navigator/user_prefs'
require_relative 'lib/redmine_journal_navigator/hooks'

Redmine::Plugin.register :redmine_journal_navigator do
  name        'Redmine Journal Navigator'
  author      'Leander Kretschmer'
  author_url  'https://github.com/leanderkretschmer'
  description 'Fügt der Ticket-Seitenleiste einen Navigator zum schnellen Durchblättern der Kommentare hinzu, sowie konfigurierbares Einklappen langer Kommentare und der Dateiliste'
  version     '0.2.0'
  url         'https://github.com/leanderkretschmer/redmine_journal_navigator'
  requires_redmine version_or_higher: '6.0.0'
end
