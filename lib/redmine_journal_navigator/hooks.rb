# frozen_string_literal: true

module RedmineJournalNavigator
  class Hooks < Redmine::Hook::ViewListener
    def view_issues_sidebar_issues_bottom(context = {})
      controller = context[:controller]
      return '' unless relevant?(controller)

      journals = controller.instance_variable_get(:@journals)
      return '' if journals.blank?

      controller.send(
        :render_to_string,
        partial: 'journal_navigator/sidebar',
        locals: { note_count: journals.size }
      )
    end

    def view_layouts_base_html_head(context = {})
      return unless relevant?(context[:controller])

      stylesheet_link_tag('journal_navigator', plugin: 'redmine_journal_navigator')
    end

    def view_layouts_base_body_bottom(context = {})
      return unless relevant?(context[:controller])

      javascript_include_tag('journal_navigator', plugin: 'redmine_journal_navigator')
    end

    private

    def relevant?(controller)
      controller.is_a?(IssuesController) && controller.action_name == 'show'
    end
  end
end
