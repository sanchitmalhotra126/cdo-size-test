require 'cdo/log_collector'

class ContactRollupsV2
  MAX_EXECUTION_TIME_SEC = 18_000

  DASHBOARD_DB_WRITER = sequel_connect(
    CDO.dashboard_db_writer,
    CDO.dashboard_db_reader,
    query_timeout: MAX_EXECUTION_TIME_SEC
  )

  def self.execute_query_in_transaction(query)
    # For long-running queries, we use Sequel connection instead of ActiveRecord connection.
    # ActiveRecord has a default 30s read_timeout that we cannot override. Sequel allows us
    # to a create connection with custom query_timeout and read_timeout values.
    #
    # However, Sequel write operations to the dashboard database don't work in test environments
    # (in local, Drone, and test machine) and Rails console sandbox. In those environments,
    # all database operations are wrapped in a ActiveRecord transaction so they can be rolled
    # back later. Sequel write operations cannot acquire a lock to the dashboard database, which
    # already locked by ActiveRecord, then fail with "Lock wait timeout exceeded" error.
    #
    # The workaround is to use different database connections in different environments.
    if Rails.env.test?
      ActiveRecord::Base.transaction {ActiveRecord::Base.connection.exec_query(query)}
    else
      DASHBOARD_DB_WRITER.transaction {DASHBOARD_DB_WRITER.run(query)}
    end
  end

  def initialize(is_dry_run: false)
    @is_dry_run = is_dry_run
    @log_collector = LogCollector.new('ContactRollupsV2')
  end

  # Build contact rollups and sync the results to Pardot.
  def build_and_sync
    collect_and_process_contacts

    # These sync steps are independent, one could fail without affecting another.
    # However, if the build step above fails, none of them should run.
    sync_new_contacts_with_pardot
    sync_updated_contacts_with_pardot
  end

  # Collects raw contact data from multiple tables into ContactRollupsRaw.
  # Then, process them and save the results into ContactRollupsProcessed.
  # The results are copied over to ContactRollupsFinal to be used for further analysis.
  def collect_and_process_contacts
    start_time = Time.now
    @log_collector.time!('Deletes intermediate content from previous runs') do
      truncate_or_delete_table ContactRollupsRaw
      truncate_or_delete_table ContactRollupsProcessed
    end

    @log_collector.time!('Extracts email preferences from dashboard.email_preferences') do
      ContactRollupsRaw.extract_email_preferences
    end
    @log_collector.time!('Extracts parent emails from dashboard.users') do
      ContactRollupsRaw.extract_parent_emails
    end

    @log_collector.time!('Processes all extracted data') do
      ContactRollupsProcessed.import_from_raw_table
    end

    @log_collector.time!("Overwrites contact_rollups_final table") do
      truncate_or_delete_table ContactRollupsFinal
      ContactRollupsFinal.insert_from_processed_table
    end
  ensure
    @log_collector.record_metrics(
      {CollectAndProcessContactsDuration: Time.now - start_time}
    )
  end

  def sync_new_contacts_with_pardot
    start_time = Time.now
    unless @is_dry_run
      @log_collector.time!('Downloads new email-Pardot ID mappings') do
        ContactRollupsPardotMemory.download_pardot_ids
      end
    end

    @log_collector.time!('Creates new Pardot prospects') do
      results = ContactRollupsPardotMemory.create_new_pardot_prospects(is_dry_run: @is_dry_run)
      @log_collector.record_metrics(
        {
          ProspectsCreated: results[:accepted_prospects],
          ProspectsRejected: results[:rejected_prospects],
          CreateAPICalls: results[:request_count]
        }
      )
    end

    unless @is_dry_run
      @log_collector.time!('Downloads new email-Pardot ID mappings (again)') do
        ContactRollupsPardotMemory.download_pardot_ids
      end
    end
  rescue StandardError => e
    @log_collector.record_exception e
  ensure
    @log_collector.record_metrics(
      {SyncNewContactsDuration: Time.now - start_time}
    )
  end

  def sync_updated_contacts_with_pardot
    start_time = Time.now
    @log_collector.time_and_continue('Updates existing Pardot prospects') do
      results = ContactRollupsPardotMemory.update_pardot_prospects(is_dry_run: @is_dry_run)
      @log_collector.record_metrics(
        {
          ProspectsUpdated: results[:updated_prospects],
          ProspectUpdatesRejected: results[:rejected_prospects],
          UpdateAPICalls: results[:request_count]
        }
      )
    end
  ensure
    @log_collector.record_metrics(
      {SyncUpdatedContactsDuration: Time.now - start_time}
    )
  end

  def collect_table_metrics
    @log_collector.record_metrics({'RawRows' => ContactRollupsRaw.count})
    @log_collector.record_metrics({'ProcessedRows' => ContactRollupsProcessed.count})
    @log_collector.record_metrics({'FinalRows' => ContactRollupsProcessed.count})
    @log_collector.record_metrics({'PardotMemoryRows' => ContactRollupsPardotMemory.count})
  end

  def report_results
    collect_table_metrics
    upload_metrics @log_collector.metrics if @is_dry_run
    CDO.log.info @log_collector
    # TODO: Report to slack channel
  end

  # Upload pipeline metrics to AWS CloudWatch.
  # https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Contact-Rollups-V2
  def upload_metrics(metrics)
    aws_metrics = metrics.map do |key, value|
      {
        metric_name: key,
        value: value,
        dimensions: [{name: "Environment", value: CDO.rack_env}]
      }
    end
    Cdo::Metrics.push('ContactRollupsV2', aws_metrics) unless @is_dry_run
  end

  private

  # Using truncate allows us to re-use row IDs,
  # which is important in production so we don't overflow the table.
  # Deletion is required in test environments, as tests generally do
  # not allow you to execute TRUNCATE statements.
  def truncate_or_delete_table(model)
    CDO.rack_env == :production ? truncate_table(model) : model.delete_all
  end

  def truncate_table(model)
    ActiveRecord::Base.connection.execute("TRUNCATE TABLE #{model.table_name}")
  end
end
