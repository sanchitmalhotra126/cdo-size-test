require 'cdo/aws/s3'
require 'cdo/rack/request'
require 'sinatra/base'

class FilesApi < Sinatra::Base
  def self.max_file_size
    5_000_000 # 5 MB
  end

  def self.max_app_size
    2_000_000_000 # 2 GB
  end

  def get_bucket_impl(endpoint)
    case endpoint
    when 'assets'
      AssetBucket
    when 'sources'
      SourceBucket
    else
      not_found
    end
  end

  def allowed_file_type?(endpoint, extension)
    case endpoint
    when 'assets'
      # Only allow specific image and sound types to be uploaded by users.
      %w(.jpg .jpeg .gif .png .mp3).include? extension
    when 'sources'
      # Only allow JavaScript and Blockly XML source files.
      %w(.js .xml .txt .json).include? extension
    else
      not_found
    end
  end

  def can_update_abuse_score?(endpoint, encrypted_channel_id, filename, new_score)
    return true if admin? or new_score.nil?

    get_bucket_impl(endpoint).new.get_abuse_score(encrypted_channel_id, filename) <= new_score.to_i
  end

  helpers do
    %w(core.rb bucket_helper.rb asset_bucket.rb source_bucket.rb storage_id.rb auth_helpers.rb).each do |file|
      load(CDO.dir('shared', 'middleware', 'helpers', file))
    end
  end

  #
  # GET /v3/(assets|sources)/<channel-id>
  #
  # List filenames and sizes.
  #
  get %r{/v3/(assets|sources)/([^/]+)$} do |endpoint, encrypted_channel_id|
    dont_cache
    content_type :json

    get_bucket_impl(endpoint).new.list(encrypted_channel_id).to_json
  end

  #
  # GET /v3/(assets|sources)/<channel-id>/<filename>?version=<version-id>
  #
  # Read a file. Optionally get a specific version instead of the most recent.
  #
  get %r{/v3/(assets|sources)/([^/]+)/([^/]+)$} do |endpoint, encrypted_channel_id, filename|
    case endpoint
    when 'assets'
      cache_one_hour
    when 'sources'
      dont_cache
    else
      not_found
    end

    type = File.extname(filename)
    not_found if type.empty?
    content_type type

    result = get_bucket_impl(endpoint).new.get(encrypted_channel_id, filename, env['HTTP_IF_MODIFIED_SINCE'], request.GET['version'])
    not_found if result[:status] == 'NOT_FOUND'
    not_modified if result[:status] == 'NOT_MODIFIED'
    last_modified result[:last_modified]

    abuse_score = result[:metadata]['abuse_score'].to_i
    not_found if abuse_score > 0 and !can_view_abusive_assets?(encrypted_channel_id)

    result[:body]
  end

  #
  # PUT /v3/(assets|sources)/<channel-id>/<filename>?version=<version-id>&abuse_score=<abuse_score>
  #
  # Create or replace a file. Optionally overwrite a specific version.
  #
  put %r{/v3/(assets|sources)/([^/]+)/([^/]+)$} do |endpoint, encrypted_channel_id, filename|
    dont_cache

    # read the entire request before considering rejecting it, otherwise varnish
    # may return a 503 instead of whatever status code we specify. Unfortunately
    # this prevents us from rejecting large files based on the Content-Length
    # header.
    body = request.body.read

    not_authorized unless owns_channel?(encrypted_channel_id)

    too_large unless body.length < FilesApi::max_file_size

    # verify that file type is in our whitelist, and that the user-specified
    # mime type matches what Sinatra expects for that file type.
    file_type = File.extname(filename)
    unsupported_media_type unless allowed_file_type?(endpoint, file_type)
    # ignore client-specified mime type. infer it from file extension
    # when serving assets.
    mime_type = Sinatra::Base.mime_type(file_type)

    buckets = get_bucket_impl(endpoint).new
    app_size = buckets.app_size(encrypted_channel_id)
    abuse_score = request.GET['abuse_score']

    not_authorized unless can_update_abuse_score?(endpoint, encrypted_channel_id, filename, abuse_score)

    forbidden unless app_size + body.length < FilesApi::max_app_size
    response = buckets.create_or_replace(encrypted_channel_id, filename, body, request.GET['version'], abuse_score)

    content_type :json
    category = mime_type.split('/').first
    {filename: filename, category: category, size: body.length, versionId: response.version_id}.to_json
  end

  #
  # PUT /v3/(assets|sources)/<channel-id>?abuse_score=<abuse_score>
  #
  # Update all assets for the given channelId to have the provided abuse score
  #
  put %r{/v3/(assets|sources)/([^/]+)$} do |endpoint, encrypted_channel_id|
    dont_cache

    abuse_score = request.GET['abuse_score']
    not_modified if abuse_score.nil?

    buckets = get_bucket_impl(endpoint).new

    buckets.list(encrypted_channel_id).each do |file|
      not_authorized unless can_update_abuse_score?(endpoint, encrypted_channel_id, file[:filename], abuse_score)
      buckets.replace_abuse_score(encrypted_channel_id, file[:filename], abuse_score)
    end

    content_type :json
    {abuse_score: abuse_score}.to_json
  end

  #
  # DELETE /v3/(assets|sources)/<channel-id>/<filename>
  #
  # Delete a file.
  #
  delete %r{/v3/(assets|sources)/([^/]+)/([^/]+)$} do |endpoint, encrypted_channel_id, filename|
    dont_cache

    owner_id, _ = storage_decrypt_channel_id(encrypted_channel_id)
    not_authorized unless owner_id == storage_id('user')

    get_bucket_impl(endpoint).new.delete(encrypted_channel_id, filename)
    no_content
  end

  #
  # GET /v3/sources/<channel-id>/<filename>/versions
  #
  # List versions of the given file.
  # NOTE: Not yet implemented for assets.
  #
  get %r{/v3/sources/([^/]+)/([^/]+)/versions$} do |encrypted_channel_id, filename|
    dont_cache
    content_type :json

    SourceBucket.new.list_versions(encrypted_channel_id, filename).to_json
  end

  #
  # PUT /v3/sources/<channel-id>/<filename>/restore?version=<version-id>
  #
  # Copies the given version of the file to make it the current revision.
  # NOTE: Not yet implemented for assets.
  #
  put %r{/v3/sources/([^/]+)/([^/]+)/restore$} do |encrypted_channel_id, filename|
    dont_cache
    content_type :json

    owner_id, _ = storage_decrypt_channel_id(encrypted_channel_id)
    not_authorized unless owner_id == storage_id('user')

    SourceBucket.new.restore_previous_version(encrypted_channel_id, filename, request.GET['version']).to_json
  end
end
