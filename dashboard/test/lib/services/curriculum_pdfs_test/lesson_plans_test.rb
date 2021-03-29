require 'test_helper'
require 'pdf/conversion'

module Services
  module CurriculumPdfsTest
    class LessonPlansTest < ActiveSupport::TestCase
      setup do
        PDF.stubs(:generate_from_url)
      end

      test 'PDF paths (and urls) are versioned' do
        script = create(:script, seeded_from: Time.at(123_456_789))
        lesson = create(:lesson, script: script)
        original_pathname = Services::CurriculumPdfs.get_lesson_plan_pathname(lesson)
        unmodified_pathname = Services::CurriculumPdfs.get_lesson_plan_pathname(lesson)
        assert_equal original_pathname, unmodified_pathname

        script.update!(seeded_from: Time.at(234_567_890))
        new_pathname = Services::CurriculumPdfs.get_lesson_plan_pathname(lesson)
        refute_equal original_pathname, new_pathname
      end

      test 'pathnames are differentiated by audience' do
        script = create(:script, name: "test-pathnames-script", seeded_from: Time.at(0))
        lesson = create(:lesson, script: script, key: "test-pathnames-lesson")
        assert_equal Pathname.new("test-pathnames-script/19700101000000/teacher-lesson-plans/test-pathnames-lesson.pdf"),
          Services::CurriculumPdfs.get_lesson_plan_pathname(lesson)
        assert_equal Pathname.new("test-pathnames-script/19700101000000/student-lesson-plans/test-pathnames-lesson.pdf"),
          Services::CurriculumPdfs.get_lesson_plan_pathname(lesson, true)
      end

      test 'Lesson PDFs are generated into the given directory' do
        script = create(:script, seeded_from: Time.now)
        lesson = create(:lesson, script: script)
        Dir.mktmpdir('curriculum_pdfs_test') do |tmpdir|
          assert Dir.glob(File.join(tmpdir, '**/*.pdf')).empty?
          url = Rails.application.routes.url_helpers.script_lesson_url(script, lesson)
          filename = File.join(tmpdir, Services::CurriculumPdfs.get_lesson_plan_pathname(lesson))
          PDF.expects(:generate_from_url).with(url, filename)
          Services::CurriculumPdfs.generate_lesson_pdf(lesson, tmpdir)
        end
      end

      test 'Student Lesson PDFs are generated into the given directory' do
        script = create(:script, seeded_from: Time.now)
        lesson = create(:lesson, script: script)
        Dir.mktmpdir('curriculum_pdfs_test') do |tmpdir|
          assert Dir.glob(File.join(tmpdir, '**/*.pdf')).empty?
          url = Rails.application.routes.url_helpers.script_lesson_student_url(script, lesson)
          filename = File.join(tmpdir, Services::CurriculumPdfs.get_lesson_plan_pathname(lesson, true))
          PDF.expects(:generate_from_url).with(url, filename)
          Services::CurriculumPdfs.generate_lesson_pdf(lesson, tmpdir, true)
        end
      end
    end
  end
end
