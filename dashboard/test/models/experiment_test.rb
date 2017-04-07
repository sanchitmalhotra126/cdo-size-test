require 'test_helper'

class ExperimentTest < ActiveSupport::TestCase
  setup do
    Experiment.stubs(:should_cache?).returns false
  end

  test "no experiments" do
    assert_empty Experiment.get_all_enabled(user: create(:user), section: create(:section))
  end

  test "user based experiment at 0 percent is not enabled" do
    create :user_based_experiment, percentage: 0
    assert_empty Experiment.get_all_enabled(user: create(:user))
  end

  test "user based experiment at 100 percent is enabled" do
    experiment = create :user_based_experiment, percentage: 100
    assert_equal [experiment], Experiment.get_all_enabled(user: create(:user))
  end

  test "user based experiment at 50 percent is enabled for only some users" do
    experiment = create :user_based_experiment, percentage: 50
    user_on = build :user, id: 1025 - experiment.id_offset
    user_off = build :user, id: 1075 - experiment.id_offset

    assert_equal [experiment], Experiment.get_all_enabled(user: user_on)
    assert_empty Experiment.get_all_enabled(user: user_off)
  end

  test "teacher based experiment at 0 percent is not enabled" do
    create :teacher_based_experiment, percentage: 0
    assert_empty Experiment.get_all_enabled(section: create(:section))
  end

  test "teacher based experiment at 100 percent is enabled" do
    experiment = create :teacher_based_experiment, percentage: 100
    assert_equal [experiment], Experiment.get_all_enabled(section: create(:section))
  end

  test "teacher based experiment at 50 percent is enabled for only some users" do
    experiment = create :teacher_based_experiment, percentage: 50
    section_on = build :section, user_id: 1025 - experiment.id_offset
    section_off = build :section, user_id: 1075 - experiment.id_offset

    assert_equal [experiment], Experiment.get_all_enabled(section: section_on)
    assert_empty Experiment.get_all_enabled(section: section_off)
  end

  test "teacher based experiment is disabled if start_time is too late" do
    create :teacher_based_experiment,
      percentage: 100,
      earliest_section_start: DateTime.now + 1.days
    section = create :section,
      first_activity_at: DateTime.now
    assert_empty Experiment.get_all_enabled(section: section)
  end

  test "teacher based experiment is disabled if end_time is too early" do
    create :teacher_based_experiment,
      percentage: 100,
      latest_section_start: DateTime.now - 1.days
    section = create :section,
      first_activity_at: DateTime.now
    assert_empty Experiment.get_all_enabled(section: section)
  end

  test "single section experiment is enabled" do
    section = create :section
    experiment = create :single_section_experiment,
      section_id: section.id
    assert_equal [experiment], Experiment.get_all_enabled(section: section)
  end

  test "single section experiment is not enabled" do
    section = create :section
    create :single_section_experiment,
      section_id: section.id + 1
    assert_empty Experiment.get_all_enabled(section: section)
  end
end

class CachedExperimentTest < ExperimentTest
  setup do
    Experiment.stubs(:should_cache?).returns true
  end
end
