# frozen_string_literal: true

module RedmineJournalNavigator
  # Per-user settings for the comment-collapse and file-list-collapse features,
  # stored in User#pref (same mechanism redmine_alternating_journals uses).
  module UserPrefs
    DEFAULTS = {
      'jn_collapse_enabled' => false,
      'jn_collapse_lines' => 6,
      'jn_collapse_autohide_enabled' => false,
      'jn_collapse_autohide_distance' => 4,
      'jn_filelist_enabled' => false,
      'jn_filelist_navigator_enabled' => false
    }.freeze

    BOUNDS = {
      'jn_collapse_lines' => (2..20),
      'jn_collapse_autohide_distance' => (2..8)
    }.freeze

    module_function

    # => { collapse_enabled: false, collapse_lines: 6, ... } (short, symbol keys)
    def for_user(user)
      pref = user&.pref
      DEFAULTS.each_with_object({}) do |(key, default), result|
        result[short_key(key)] = coerce(key, pref && pref[key], default)
      end
    end

    def save(user, params)
      pref = user.pref
      DEFAULTS.each_key do |key|
        short = short_key(key)
        next unless params.key?(short) || params.key?(short.to_s)

        raw = params[short] || params[short.to_s]
        pref[key] = persisted_value(key, raw)
      end
      pref.save!
    end

    def short_key(key)
      key.sub(/\Ajn_/, '').to_sym
    end

    def coerce(key, raw, default)
      if boolean_key?(default)
        raw.nil? ? default : raw.to_s == '1'
      else
        value = raw.nil? || raw.to_s.strip.empty? ? default : raw.to_i
        clamp(key, value)
      end
    end

    def persisted_value(key, raw)
      if boolean_key?(DEFAULTS[key])
        ActiveModel::Type::Boolean.new.cast(raw) ? '1' : '0'
      else
        clamp(key, raw.to_i).to_s
      end
    end

    def boolean_key?(default)
      default == true || default == false
    end

    def clamp(key, value)
      range = BOUNDS[key]
      range ? value.clamp(range) : value
    end
  end
end
