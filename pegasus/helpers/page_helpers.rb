def page_title_with_tagline()
  title = @header['title'] || @config[:page_default_title].to_s
  tagline = @header['tagline'] || @config[:page_default_tagline].to_s
  return title if tagline.empty? || title == tagline
  title + ' | ' + tagline
end

def page_translated?()
  request.locale != 'en-US'
end

def not_partner_site?()
  request.site != 'uk.code.org' && request.site != 'ar.code.org' && request.site != 'br.code.org' && request.site != 'italia.code.org' && request.site != 'ro.code.org'
end
