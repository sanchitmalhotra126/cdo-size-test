# == Schema Information
#
# Table name: foorm_libraries
#
#  id         :bigint           not null, primary key
#  name       :string(255)      not null
#  version    :integer          not null
#  published  :boolean          not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_foorm_libraries_on_multiple_fields  (name,version) UNIQUE
#
class Foorm::Library < ApplicationRecord
  include Seeded

  has_many :library_questions, primary_key: [:name, :version], foreign_key: [:library_name, :library_version]

  def self.setup
    Dir.glob('config/foorm/library/**/*.json').each do |path|
      # Given: "config/foorm/library/surveys/pd/pre_workshop_survey.0.json"
      # we get full_name: "surveys/pd/pre_workshop_survey"
      #      and version: 0
      unique_path = path.partition("config/foorm/library/")[2]
      filename_and_version = File.basename(unique_path, ".json")
      filename, version = filename_and_version.split(".")
      version = version.to_i
      full_name = File.dirname(unique_path) + "/" + filename

      # Let's load the JSON text.
      begin
        library = Foorm::Library.find_or_initialize_by(
          name: full_name,
          version: version
        )

        source_questions = JSON.parse(File.read(path))
        # if published is not provided, default to true
        published = source_questions['published'].nil? ? true : source_questions['published']

        library.published = published
        library.save! if library.changed?

        source_questions["pages"].map do |page|
          page["elements"].map do |element|
            question_name = element["name"]
            library_question = Foorm::LibraryQuestion.find_or_initialize_by(
              library_name: full_name,
              library_version: version,
              question_name: question_name
            )
            library_question.question = element.to_json
            library_question.published = published
            library_question.save! if library_question.changed?
          end
        end
      rescue
        raise format('failed to parse %s', full_name)
      end
    end
  end
end
