# Joins a Script to a Level
# A Script has one or more Levels, and a Level can belong to one or more Scripts
class ScriptLevel < ActiveRecord::Base
  belongs_to :level
  belongs_to :script
  belongs_to :stage
  acts_as_list scope: :stage

  NEXT = 'next'

  # this is a temporary (request-scope) variable set by User.rb#levels_from_script to find the UserLevel
  # corresponding to this ScriptLevel for a specific user
  attr_accessor :user_level

  def next_level
    script.script_levels.where(["chapter > ?", self.chapter]).order('chapter asc').first
  end

  def next_progression_level
    next_level ? next_level.or_next_progression_level : nil
  end

  def or_next_progression_level
    valid_progression_level? ? self : next_progression_level
  end

  def valid_progression_level?
    return false if level.unplugged?
    return false if stage && stage.unplugged?
    true
  end

  def previous_level
    if self.stage
      if self.script.cached?
        i = self.script.script_levels.index(self)
        return nil if i.nil? || i == 0
        self.script.script_levels[i - 1]
      else
        self.higher_item
      end
    else
      self.script.try(:get_script_level_by_chapter, self.chapter - 1)
    end
  end

  def end_of_stage?
    stage ? (self.last?) :
      next_progression_level && (level.game_id != next_progression_level.level.game_id)
  end

  def stage_position_str
    stage ? I18n.t('stage_number', number: stage.position) : I18n.t("data.script.name.#{script.name}.#{level.game.name}")
  end

  def name
    I18n.t("data.script.name.#{script.name}.#{stage ? stage.name : level.game.name}")
  end

  def report_bug_url(request)
    stage_text = stage ? "Stage #{stage.position} " : ' '
    message = "Bug in Course #{script.name} #{stage_text}Puzzle #{position}\n#{request.url}\n#{request.user_agent}\n"
    "https://support.code.org/hc/en-us/requests/new?&description=#{CGI.escape(message)}"
  end

  def level_display_text
    if level.unplugged?
      I18n.t('user_stats.classroom_activity')
    elsif stage && stage.unplugged?
      stage_or_game_position - 1
    else
      stage_or_game_position
    end
  end

  def stage_or_game
    stage ? stage : level.game
  end

  def stage_or_game_position
    self.stage ? self.position : self.game_chapter
  end

  def stage_or_game_total
    @@stage_or_game_total ||= {}
    @@stage_or_game_total[self.id] ||=
      stage ? stage.script_levels.count :
              script.script_levels_from_game(level.game_id).count
  end

  def self.cache_find(id)
    @@script_level_map ||= ScriptLevel.includes(:level, :script).index_by(&:id)
    @@script_level_map[id]
  end

  def available_callouts
    @@available_callouts ||= {}
    @@available_callouts[self.id] ||=
      Callout.where(script_level_id: self.id).select(:id, :element_id, :qtip_config, :localization_key)
    return @@available_callouts[self.id]
  end

  def self.clear_available_callouts_cache
    @@available_callouts = {}
  end
end
