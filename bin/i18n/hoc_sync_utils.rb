require_relative '../../dashboard/config/environment'
require File.expand_path('../../../pegasus/src/env', __FILE__)

require 'cdo/languages'
require 'fileutils'
require 'tempfile'

class HocSyncUtils
  def self.sync_out
    rename_downloads_from_crowdin_code_to_locale
    copy_from_i18n_source_to_hoc
    restore_sanitized_headers
  end

  def self.rename_downloads_from_crowdin_code_to_locale
    puts "Updating crowdin codes to our locale codes..."
    Languages.get_hoc_languages.each do |prop|
      # move downloaded folders to root source directory and rename from language
      # to locale
      next unless File.directory?("i18n/locales/source/hourofcode/#{prop[:crowdin_name_s]}/")

      FileUtils.cp_r "i18n/locales/source/hourofcode/#{prop[:crowdin_name_s]}/.", "i18n/locales/#{prop[:locale_s]}"
      FileUtils.rm_r "i18n/locales/source/hourofcode/#{prop[:crowdin_name_s]}"

      # rename yml file from en.yml to code
      old_path = "i18n/locales/#{prop[:locale_s]}/hourofcode/en.yml"
      new_path = "i18n/locales/#{prop[:locale_s]}/hourofcode/#{prop[:unique_language_s]}.yml"

      File.rename(old_path, new_path)
      file = "i18n/locales/#{prop[:locale_s]}/hourofcode/#{prop[:unique_language_s]}.yml"
      File.write(file, File.read(file).gsub(/'#{prop[:crowdin_code_s]}':/, "#{prop[:unique_language_s]}:"))
      puts "Renaming #{prop[:locale_s]}.yml to #{prop[:unique_language_s]}.yml"
    end
  end

  def self.copy_from_i18n_source_to_hoc
    puts "Copying files from cdo/i18n to hoc.com/i18n..."
    Languages.get_hoc_languages.each do |prop|
      next if prop[:locale_s] == "en-US"
      i18n_path = "i18n/locales/#{prop[:locale_s]}/hourofcode"
      hoc_path = "pegasus/sites.v3/hourofcode.com/i18n"

      # Copy the file containing developer-added strings
      FileUtils.cp(i18n_path + "/#{prop[:unique_language_s]}.yml", hoc_path) if File.exist?(i18n_path + "/#{prop[:unique_language_s]}.yml")

      # Copy the markdown files representing individual page content
      Dir.glob(File.join(i18n_path, "**/*.md")).each do |source_path|
        # Copy file from the language-specific i18n directory to the
        # language-specific pegasus directory.
        source_dir = File.dirname(source_path)
        dest_dir = source_dir.sub(i18n_path, File.join(hoc_path, "public", prop[:unique_language_s]))

        # Crowdin didn't place nicely with changing the file extensions from md
        # to md.partial As a hopefully temporary solution, on the sync in we
        # remove the .partial ending and here we add it back.
        dest_name = File.basename(source_path) + ".partial"

        FileUtils.mkdir_p(dest_dir)
        FileUtils.cp(source_path, File.join(dest_dir, dest_name))
      end

      puts "Copied locale #{prop[:unique_language_s]}"
    end
  end

  def self.restore_sanitized_headers
    # In the sync in, we slice the YAML headers of the files we upload to crowdin
    # down to just the part we want to translate (ie, the title). Here, we
    # reinflate the header with all the values from the source file.
    Dir.glob("pegasus/sites.v3/hourofcode.com/i18n/public/**/*.md.partial").each do |path|
      source_path = path.sub(/\/i18n\/public\/..\//, "/public/")
      unless File.exist? source_path
        # Because we give _all_ files coming from crowdin the partial extension,
        # we can't know for sure whether or not the source did unless we check
        # both with and without.
        source_path = File.join(File.dirname(source_path), File.basename(source_path, ".partial"))
      end
      source_header, _source_content, _source_line = Documents.new.helpers.parse_yaml_header(source_path)
      header, content, _line = Documents.new.helpers.parse_yaml_header(path)
      header.slice!("title")
      restored_header = source_header.merge(header)
      open(path, 'w') do |f|
        unless restored_header.empty?
          f.write(restored_header.to_yaml)
          f.write("---\n\n")
        end
        f.write(content)
      end
    end
  end
end
