require_relative '../../../deployment'
require 'aws-sdk-databasemigrationservice'
require 'ostruct'

module Cdo
  class DMS
    # Generates a set of DMS task definition hashes from a source YAML configuration file.
    def self.tasks(file)
      tasks = YAML.load_file(file)
      tasks.map do |task_name, task|
        rules = []
        remove_rules = []

        task.each do |schema|
          properties = nil
          schema, properties = schema.first if schema.is_a?(Hash)
          schema, table = schema.split '.'
          schema = CDO["#{schema}_db_name"]

          rules << {
            'rule-type': 'selection',
            'object-locator': {
              'schema-name': schema,
              'table-name': table
            },
            'rule-action': 'include'
          }

          # Remove specified columns using transformation rule.
          properties &&
            (columns = properties['remove_column']) &&
            columns.each do |column|
              remove_rules << {
                'rule-type': 'transformation',
                'rule-action': 'remove-column',
                'rule-target': 'column',
                'object-locator': {
                  'schema-name': schema,
                  'table-name': table,
                  'column-name': column
                }
              }
            end
        end

        rules.concat remove_rules

        # Migrate `-pii` tasks to alternative schema using transformation rule.
        if task_name.end_with? '-pii'
          rules << {
            'rule-type': 'transformation',
            'rule-action': 'add-suffix',
            'rule-target': 'schema',
            'object-locator': {'schema-name': '%'},
            'value': '_pii'
          }
        end

        # Add auto-increment rule-name and rule-id keys in specific order.
        rules = rules.map.with_index do |rule, index|
          rule.to_a.
            insert(1, ['rule-name', (index + 1).to_s]).
            insert(1, ['rule-id', (index + 1).to_s]).
            to_h
        end

        [task_name, {rules: rules}]
      end
    end

    # Get list of production Replication Tasks and return as an array of
    # Aws::DatabaseMigrationService::Types::ReplicationTask
    # https://docs.aws.amazon.com/ja_jp/sdk-for-ruby/v3/api/Aws/DatabaseMigrationService/Types/ReplicationTask.html
    def self.production_replication_tasks
      dms_client = Aws::DatabaseMigrationService::Client.new
      replication_tasks = dms_client.describe_replication_tasks({without_settings: true}).replication_tasks
      replication_tasks.select do |task|
        dms_client.
          list_tags_for_resource({resource_arn: task.replication_task_arn}).
          tag_list.
          any? {|tag| tag.key == 'environment' && tag.value == 'production'}
      end
    end

    # Get current status of a Replication Task including table statistics.
    def self.replication_task_status(replication_task_arn)
      task = OpenStruct.new(arn: replication_task_arn)

      dms_client = Aws::DatabaseMigrationService::Client.new
      replication_task = dms_client.describe_replication_tasks(
        {
          filters: [
            {
              name: 'replication-task-arn',
              values: [replication_task_arn]
            }
          ]
        },
        max_records: 1,
        without_settings: true
      ).replication_tasks[0]

      # Collect the replication task attributes that identify overall replication status.
      task.status = replication_task.status
      task.last_failure_message = replication_task.last_failure_message
      task.stop_reason = replication_task.stop_reason
      task.start_date = replication_task.replication_task_start_date
      task.full_load_progress_percent = replication_task.replication_task_stats.full_load_progress_percent
      task.tables_loaded = replication_task.replication_task_stats.tables_loaded
      task.tables_loading = replication_task.replication_task_stats.tables_loading
      task.tables_queued = replication_task.replication_task_stats.tables_queued
      task.tables_errored = replication_task.replication_task_stats.tables_errored

      task.table_statistics = dms_client.describe_table_statistics(
        {
          replication_task_arn: replication_task_arn
        }
      ).table_statistics

      return task
    end

    # Start a replication task and wait until it completes, raising an error if the task did not complete within a
    # configurable time period or did not complete successfully.
    # @replication_task_arn [String]
    def self.start_replication_task(replication_task_arn)
      CDO.log.info "Starting DMS Replication Task: #{replication_task_arn}"
      current_task_status = replication_task_status(replication_task_arn).status
      dms_client = Aws::DatabaseMigrationService::Client.new
      dms_client.start_replication_task(
        {
          replication_task_arn: replication_task_arn,
          # TODO: (suresh) 'not-started' is not the correct status of a Replication Task that has not ever been executed.
          start_replication_task_type: current_task_status != 'not-started' ? 'reload-target' : 'start-replication'
        }
      )

      # Wait 16 hours, checking every 10 minutes.  As of late-2019, it takes about 8 hours for the user_levels task to complete.
      task_status = wait_until_replication_task_completed(replication_task_arn, 96, 600)
      CDO.log.info task_status

      CDO.log.info "DMS Task Completed Successfully: #{replication_task_arn}"
    rescue StandardError => error
      CDO.log.info "Error executing DMS Replication Task #{replication_task_arn} - #{error.message}"
      raise error
    end

    def self.wait_until_replication_task_completed(replication_task_arn, max_attempts, delay)
      attempts = 0
      task = nil
      while attempts <= max_attempts && task.status != 'stopped'
        task = replication_task_status(replication_task_arn)

        attempts += 1
        CDO.log.info "Attempt: #{attempts} of #{max_attempts} / #{task}"
        sleep delay
      end

      return task if replication_task_completed_successfully?(task.arn)

      raise StandardError.new("Timeout after waiting #{attempts * delay} seconds or Replication Task" \
    " #{replication_task_arn} did not complete successfully.  Task Status - #{task.status} / #{task}"
      )
    end

    # Determine whether a Full Load Replication Task has completed successfully.
    def self.replication_task_completed_successfully?(replication_task_arn)
      task = replication_task_status(replication_task_arn)

      return task.status == 'stopped' &&
        task.stop_reason.include?('FULL_LOAD_ONLY_FINISHED') &&
        task.replication_task_stats.full_load_progress_percent == 100 &&
        task.replication_task_stats.tables_loaded > 0 &&
        task.replication_task_stats.tables_loading == 0 &&
        task.replication_task_stats.tables_queued == 0 &&
        task.replication_task_stats.tables_errored == 0 &&
        task.table_statistics.all? {|table| table.table_state == 'Table completed'}
    end
  end
end
