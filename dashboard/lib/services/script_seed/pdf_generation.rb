require 'cdo/chat_client'
require 'dynamic_config/dcdo'
require 'pdf/conversion'

module Services
  module ScriptSeed
    # Contains all code related to the automatic generation of Lesson Plan PDFs
    # as part of the Script seeding process.
    module PdfGeneration
      DEBUG = true
      S3_BUCKET = "cdo-lesson-plans#{'-dev' if DEBUG}".freeze

      # standard generic boilerplate code for prepending class methods
      def self.prepended(base)
        class << base
          prepend ClassMethods
        end
      end

      module ClassMethods
        # Wraps ScriptSeed.seed_from_hash with logic to (re-)generate a PDF for
        # the specified script after seeding.
        #
        # We specifically _wrap_ the method rather than simply extending it;
        # this is because we need to examine the state of the data prior to
        # seeding to determine whether or not we're going to want to generate a
        # pdf, but of course the generation itself should happen after seeding.
        #
        # We also are wrapping this specific method rather than one of the
        # more-specific ones like import_script or import_lessons because all
        # of those methods are called within a transaction created by this
        # method, and we want to make sure to generate PDFs _after_ the
        # transaction has been resolved.
        def seed_from_hash(data)
          should_generate_pdfs = generate_pdfs?(data['script'])
          result = super
          generate_pdfs(result) if should_generate_pdfs
          result
        end

        private

        # Whether or not we should generate PDFs. Specifically, this
        # encapsulates three concerns:
        #
        # 1. Is this code running on the staging server? We only want to do this
        #    as part of the staging build; the generated PDFs will be made
        #    available to other environments, so they don't need to run this
        #    process themselves.
        # 2. Is the script one for which we care about PDFs? Right now, we only
        #    want to generate PDFs for "migrated" scripts.
        # 3. Is the script actually being updated? The overall seed process is
        #    indiscriminate, and will happily re-seed content even without
        #    changes. This is fine for database upserts, but we want to be more
        #    cautious with the more-expensive PDFs generation process.
        #
        # In addition, we support manually disabling this feature with DCDO
        def generate_pdfs?(script_data)
          return true if DEBUG

          return false unless rack_env?(:staging)
          return false unless script_data['properties'].fetch('is_migrated', false)
          return false if DCDO.get('disable_lesson_plan_pdf_generation', false)

          new_version = script_data['serialized_at']
          existing_version = Script.find_by(name: script_data['name']).seeded_at
          new_version != existing_version
        end

        def generate_pdfs(script)
          ChatClient.log "Generating PDFs for #{script.name}"

          pdf_dir = Dir.mktmpdir("pdf_generation")

          # Individual Lesson PDFs
          script.lessons.select(&:has_lesson_plan).each do |lesson|
            generate_lesson_pdf(lesson, pdf_dir)
          end

          # TODO: Script Overview PDFs
          #
          # There are still some outstanding questions as to what exactly we
          # want to do here. We know we want to provide a single PDF containing
          # all lesson data (so users who want to print all lessons for a script
          # can do so in a single print job), but it sounds like we also want
          # some kind of script overview contenet and possibly also a "visual
          # map" of the lesson plans.
          #
          # Notably, we haven't yet moved over course and script overview
          # content from CurriculumBuilder nor built views for displaying that
          # content. Once we do, we will be better prepared to figure out what
          # kind of PDF to construct here.
          upload_generated_pdfs_to_s3(pdf_dir)

          FileUtils.remove_entry_secure(pdf_dir) unless DEBUG
        end

        def generate_lesson_pdf(lesson, directory="/tmp/")
          url = Rails.application.routes.url_helpers.script_lesson_url(lesson.script, lesson)

          version_number = Time.parse(lesson.script.seeded_at).to_s(:number)
          subdirectory = File.join(lesson.script.name, version_number)
          filename = ActiveStorage::Filename.new(lesson.key + ".pdf").sanitized
          FileUtils.mkdir_p(File.join(directory, subdirectory))

          ChatClient.log "Generating #{File.join(subdirectory, filename).inspect} from #{url.inspect}"
          PDF.generate_from_url(url, File.join(directory, subdirectory, filename))
        end

        def upload_generated_pdfs_to_s3(directory)
          ChatClient.log "Uploading all generated PDFs to S3"
          ChatClient.log "from local temporary directory #{directory.inspect}" if DEBUG
          Dir.glob(File.join(directory, '**/*.pdf')).each do |filepath|
            # Note that this "filename" includes subdirectories; this is fine
            # only because we're uploading to S3.
            data = File.read(filepath)
            filename = filepath.delete_prefix(directory).delete_prefix('/')
            AWS::S3.upload_to_bucket(S3_BUCKET, filename, data, no_random: true)
          end
        end
      end
    end
  end
end
