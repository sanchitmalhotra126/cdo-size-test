# == Schema Information
#
# Table name: pd_payment_terms
#
#  id                  :integer          not null, primary key
#  regional_partner_id :integer
#  start_date          :date
#  end_date            :date
#  course              :string(255)
#  subject             :string(255)
#  properties          :text(65535)
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#
# Indexes
#
#  index_pd_payment_terms_on_regional_partner_id  (regional_partner_id)
#

class Pd::PaymentTerm < ApplicationRecord
  include SerializedProperties

  belongs_to :regional_partner

  serialized_attrs %w(
    per_attendee_payment
    fixed_payment
    minimum_attendees_for_payment
    maximum_attendees_for_payment
    pay_facilitators
  )

  def self.for_workshop(workshop)
    return nil unless workshop.regional_partner

    found_payment_terms = nil # Should always be exactly one term, otherwise we are in bad state

    # First - look for the given date range. So all terms with start date <= workshop
    # date, and either nil end_date or end_date in the future
    payment_terms = where(regional_partner: workshop.regional_partner).
        where('start_date <= ?', workshop.workshop_starting_date).
        where('end_date > ? or end_date IS NULL', workshop.workshop_starting_date)

    # Now, look for ones with the course that matches. If there are none, fall back to nil
    payment_terms_for_course = payment_terms.where(course: workshop.course)

    if payment_terms_for_course.any?
      payment_terms_with_course_and_subject = payment_terms_for_course.where(subject: workshop.subject)
      found_payment_terms = payment_terms_with_course_and_subject.any? ? payment_terms_with_course_and_subject : payment_terms_for_course
    else
      found_payment_terms = payment_terms
    end

    # We should have exactly one payment term at this point, raise exception if we don't
    if found_payment_terms.empty?
      raise "No payment terms were found for workshop #{workshop.id}"
    elsif found_payment_terms.size > 1
      raise "Multiple payment terms were found for workshop #{workshop.id}"
    end

    found_payment_terms[0]
  end

  def calculate(workshop)
    if workshop.course == Pd::Workshop::COURSE_CSF
      calculate_csf_workshop(workshop)
    else
      calculate_non_csf_workshop(workshop)
    end
  end

  private

  def calculate_csf_workshop(workshop)

  end

  def calculate_non_csf_workshop(workshop)

  end
end
