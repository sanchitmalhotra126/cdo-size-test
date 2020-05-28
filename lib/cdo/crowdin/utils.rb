require 'json'
require 'parallel'

module Crowdin
  class Utils
    # @param project [Crowdin::Project]
    # @param options [Hash, nil]
    # @param options.changes_json [String, nil] path to file where files with
    #  changes will be written out in JSON format
    # @param options.etags_json [String, nil] path to file where etags will be
    #  written out in JSON format
    # @param options.locales_dir [String, nil] path to directory where changed
    #  files should be downloaded
    # @param options.logger [Logger, nil]
    def initialize(project, options={})
      @project = project
      @changes_json = options.fetch(:changes_json, "/tmp/#{project.id}_changes.json")
      @etags_json = options.fetch(:etags_json, "/tmp/#{project.id}_etags.json")
      @locales_dir = options.fetch(:locales_dir, "/tmp/locales")
      @logger = options.fetch(:logger, Logger.new(STDOUT))
    end

    # Fetch from Crowdin a list of files changed since the last sync. Uses
    # etags sourced from the @etags_json file to define what we mean by "since
    # the last sync," and writes the results out to @changes_json.
    def fetch_changes
      etags = File.exist?(@etags_json) ? JSON.parse(File.read(@etags_json)) : {}
      changes = {}

      languages = @project.languages
      num_languages = languages.length
      languages.each_with_index do |language, i|
        code = language["code"]
        @logger.debug("#{language['name']} (#{code}): #{i}/#{num_languages}")
        @logger.info("~#{(i * 100 / num_languages).round(-1)}% complete (#{i}/#{num_languages})") if i > 0 && i % (num_languages / 5) == 0

        etags[code] ||= {}
        files = @project.list_files

        results = Parallel.map(files) do |file|
          etag = etags[code].fetch(file, nil)
          response = @project.export_file(file, code, etag)
          case response.code
          when 200
            [file, response.headers["etag"]]
          when 304
            nil
          else
            raise "cannot handle response code #{response.code}"
          end
        end.compact

        next if results.empty?

        changes[code] = results.to_h
        etags[code].merge!(changes[code])
        File.write(@etags_json, JSON.pretty_generate(etags))
        File.write(@changes_json, JSON.pretty_generate(changes))
      end

      File.write(@changes_json, JSON.pretty_generate(changes))
    end

    # Downloads all files referenced in @changes_json to @locales_dir
    def download_changed_files
      changes = JSON.parse(File.read(@changes_json))
      @logger.info("#{changes.keys.length} languages have changes")
      @project.languages.each do |language|
        code = language["code"]
        name = language["name"]
        files = changes.fetch(code, nil)
        next unless files.present?
        filenames = files.keys
        locale_dir = File.join(@locales_dir, name)

        @logger.debug("#{name} (#{code}): #{filenames.length} files have changes")
        Parallel.each(filenames) do |file|
          response = @project.export_file(file, code)
          dest = File.join(locale_dir, file)
          FileUtils.mkdir_p(File.dirname(dest))
          File.write(dest, response.body)
        end
      end
    end
  end
end
