require File.expand_path('../router', __FILE__)

unless rack_env? :production
  require 'cdo/rack/https_redirect'
  use Rack::HTTPSRedirect
end

require 'varnish_environment'
use VarnishEnvironment

require 'assets_api'
use AssetsApi

require 'channels_api'
use ChannelsApi

require 'properties_api'
use PropertiesApi

require 'tables_api'
use TablesApi

require 'shared_resources'
use SharedResources

run Documents
