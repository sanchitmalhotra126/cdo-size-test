require 'cdo/rack/request'

module Rack; class Request

  def self.localized_uris()
    [
      '/',
      '/learn',
      '/learn/beyond',
      '/congrats',
      '/language_test',
      '/teacher-dashboard',
      '/teacher-dashboard/landing',
      '/teacher-dashboard/nav',
      '/teacher-dashboard/section_manage',
      '/teacher-dashboard/section_progress',
      '/teacher-dashboard/sections',
      '/teacher-dashboard/signin_cards',
      '/teacher-dashboard/student'
    ]
  end

  def self.locales_supported()
    @@locales_supported ||= Dir.glob(cache_dir('i18n/*.yml')).map{|i| ::File.basename(i, '.yml').downcase}.sort
  end

  def language()
    @pegasus_language ||= env['HTTP_X_VARNISH_ACCEPT_LANGUAGE'] if Request.localized_uris.include?(path_info)
    @pegasus_language ||= 'en'
  end

  def locale()
    @pegasus_locale ||= locale_()
  end

  def locale_()
    desired = language.downcase
    locale = Request.locales_supported.find{|i| i==desired || i.split('-').first==desired}
    locale ||= 'en-us'

    parts = locale.split('-')
    return "#{parts[0]}-#{parts[1].upcase}"
  end

  def site()
    @pegasus_site ||= site_
  end

  def site_()
    parts = host.split('.')
    if parts.count >= 3
      domain = parts.last(3).join('.').split(':').first
      return domain if ['studio.code.org', 'learn.code.org','uk.code.org', 'i18n.code.org', 'al.code.org', 'ar.code.org', 'br.code.org', 'italia.code.org', 'ro.code.org', 'eu.code.org'].include?(domain)
    end

    domain = parts.last(2).join('.').split(':').first
    return domain if ['csedweek.org','hourofcode.com'].include?(domain)

    'code.org'
  end

end; end
