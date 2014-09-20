require 'geocoder'

module ReplaceFreegeoipHostModule

  def self.included base
    base.class_eval do

      def query_url(query)
        "#{protocol}://#{CDO.freegeoip_host}/json/#{query.sanitized_text}"
      end

    end
  end

end
Geocoder::Lookup::Freegeoip.send(:include,ReplaceFreegeoipHostModule) if CDO.freegeoip_host

def geocoder_config
  config = {
    cache: Hash.new,
    timeout: 10,
    units: :km,
  }

  client_id = CDO.google_maps_client_id
  secret = CDO.google_maps_secret
  if client_id && secret
    config[:lookup] = :google_premier
    config[:api_key] = [secret,client_id,'pegasus']
  end

  config
end
Geocoder.configure(geocoder_config)
