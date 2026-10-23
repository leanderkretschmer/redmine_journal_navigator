# frozen_string_literal: true

class JournalNavigatorPreferencesController < ApplicationController
  before_action :require_login

  def update
    RedmineJournalNavigator::UserPrefs.save(User.current, params.permit(
      :collapse_enabled, :collapse_lines,
      :collapse_autohide_enabled, :collapse_autohide_distance,
      :filelist_enabled, :filelist_navigator_enabled, :comment_filelist_enabled
    ).to_h.symbolize_keys)

    render json: { ok: true }
  rescue StandardError => e
    render json: { ok: false, error: e.message }, status: :internal_server_error
  end
end
