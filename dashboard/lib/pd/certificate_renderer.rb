module Pd
  class CertificateRenderer
    HARDCODED_CSD_FACILITATOR = 'Dani McAvoy'
    HARDCODED_CSP_FACILITATOR = 'Brook Osborne'
    HARDCODED_OTHER_TEACHERCON_FACILITATOR = 'Code.org team'

    # Given a PD enrollment, renders a workshop completion certificate.
    #
    # @note This method returns a newly-allocated Magick::Image object.
    #       The caller MUST ensure image#destroy! is called on the returned image
    #       object to avoid memory leaks.
    #
    # @param [Pd::Enrollment] a teacher's workshop enrollment
    def self.render_workshop_certificate(enrollment)
      create_workshop_certificate_image(
        dashboard_dir('app', 'assets', 'images', 'pd_workshop_certificate_generic.png'),
        [
          *teacher_name(enrollment),
          *pd_hours(enrollment.workshop),
          *workshop_dates(enrollment.workshop),
          *course_name(enrollment.workshop),
          *facilitators(enrollment.workshop)
        ]
      )
    end

    # The methods that follow generate field configurations for printing text
    # onto the certificate image.

    private_class_method def self.teacher_name(enrollment)
      [
        {
          string: enrollment.try(:full_name) || '',
          pointsize: 90,
          height: 100,
          width: 1200,
          x: 570,
          y: 570,
        }
      ]
    end

    private_class_method def self.course_name(workshop)
      if workshop.csf?
        [
          {
            string: workshop.course_name,
            y: 780,
            pointsize: 90,
            height: 100,
          },
          {
            string: workshop.friendly_subject,
            y: 870,
            pointsize: 80,
            height: 90,
          }
        ]
      else
        [
          {
            string: workshop.course_name,
            y: 800,
            pointsize: 90,
            height: 100,
          }
        ]
      end
    end

    private_class_method def self.pd_hours(workshop)
      [
        {
          string: ActiveSupport::NumberHelper.number_to_rounded(workshop.effective_num_hours, precision: 1, strip_insignificant_zeros: true),
          y: 975,
          x: 1065,
          height: 40,
          width: 50,
          pointsize: 40,
        }
      ]
    end

    private_class_method def self.workshop_dates(workshop)
      [
        {
          string: workshop.workshop_date_range_string,
          y: 1042,
          height: 50,
          pointsize: 45,
        }
      ]
    end

    private_class_method def self.facilitators(workshop)
      facilitator_names(workshop).each_with_index.map do |name, i|
        {
          string: name,
          height: 50,
          pointsize: 40,
          width: 420,
          y: 1305 - (50 * i),
          x: 1290,
        }
      end
    end

    private_class_method def self.facilitator_names(workshop)
      if workshop.teachercon?
        case workshop.course
        when Pd::Workshop::COURSE_CSD
          [HARDCODED_CSD_FACILITATOR]
        when Pd::Workshop::COURSE_CSP
          [HARDCODED_CSP_FACILITATOR]
        else
          [HARDCODED_OTHER_TEACHERCON_FACILITATOR]
        end
      else
        workshop.facilitators.map {|f| f.name.strip}.sort
      end
    end
  end
end
