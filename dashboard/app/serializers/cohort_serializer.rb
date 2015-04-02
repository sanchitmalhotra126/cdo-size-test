class CohortSerializer < ActiveModel::Serializer
  attributes :id, :name, :program_type, :cutoff_date, :districts
  has_many :workshops
  has_many :teachers

  def districts
    object.cohorts_districts.map{|cd| CohortsDistrictSerializer.new(cd).attributes}
  end

  def cutoff_date
    object.cutoff_date.strftime('%Y-%m-%d')
  end
end
