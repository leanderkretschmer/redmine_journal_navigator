# frozen_string_literal: true

module RedmineJournalNavigator
  class Hooks < Redmine::Hook::ViewListener
    def view_issues_sidebar_issues_bottom(context = {})
      controller = context[:controller]
      return '' unless issue_show?(controller)

      journals = controller.instance_variable_get(:@journals)
      note_count = journals.to_a.count { |journal| journal.notes.present? }
      return '' if note_count.zero?

      controller.send(
        :render_to_string,
        partial: 'journal_navigator/sidebar',
        locals: { note_count: note_count }
      )
    end

    def view_my_account(context = {})
      user = context[:user] || User.current
      prefs = UserPrefs.for_user(user)

      context[:controller].send(
        :render_to_string,
        partial: 'journal_navigator/account_settings',
        locals: { prefs: prefs }
      )
    end

    def view_layouts_base_html_head(context = {})
      controller = context[:controller]

      if issue_show?(controller)
        stylesheet_link_tag('journal_navigator', 'journal_collapse', 'attachment_collapse',
                             plugin: 'redmine_journal_navigator')
      elsif my_account?(controller)
        stylesheet_link_tag('account_settings', 'journal_collapse', 'attachment_collapse',
                             plugin: 'redmine_journal_navigator')
      end
    end

    def view_layouts_base_body_bottom(context = {})
      controller = context[:controller]

      if issue_show?(controller)
        issue_show_scripts(controller)
      elsif my_account?(controller)
        account_settings_scripts
      end
    end

    private

    def issue_show?(controller)
      controller.is_a?(IssuesController) && controller.action_name == 'show'
    end

    def my_account?(controller)
      controller.is_a?(MyController) && controller.action_name == 'account'
    end

    def issue_show_scripts(controller)
      issue = controller.instance_variable_get(:@issue)
      prefs = UserPrefs.for_user(User.current)

      config = {
        collapseEnabled: prefs[:collapse_enabled],
        collapseLines: prefs[:collapse_lines],
        collapseAutohideEnabled: prefs[:collapse_autohide_enabled],
        collapseAutohideDistance: prefs[:collapse_autohide_distance],
        filelistEnabled: prefs[:filelist_enabled],
        filelistNavigatorEnabled: prefs[:filelist_navigator_enabled],
        attachmentSummary: attachment_summary_for(issue),
        i18n: {
          expand: l(:button_jn_expand),
          collapse: l(:button_jn_collapse),
          filterPlaceholder: l(:label_jn_file_filter_placeholder)
        }
      }

      config_script = "<script>window.RedmineJournalNavigatorConfig = #{safe_json(config)};</script>".html_safe

      config_script +
        javascript_include_tag('journal_navigator', 'journal_collapse', 'attachment_collapse',
                                'journal_navigator_bootstrap', plugin: 'redmine_journal_navigator')
    end

    def account_settings_scripts
      javascript_include_tag('journal_collapse', 'attachment_collapse', 'account_settings',
                              plugin: 'redmine_journal_navigator')
    end

    def attachment_summary_for(issue)
      return nil unless issue&.attachments&.any?

      total = issue.attachments.sum(&:filesize)
      l(:label_jn_attachment_summary, count: issue.attachments.count, size: number_to_human_size(total))
    end

    def safe_json(data)
      data.to_json.gsub('</', '<\/')
    end
  end
end
