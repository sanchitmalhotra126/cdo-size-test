# LogCollector is a simple container that collects log messages and exceptions
# when executing a task. It can also time block execution and log the result.
#
# LogCollector is helpful when we want to
# - Prevent non-fatal errors from stopping process execution but still want to know about them.
# - Bubble up combined errors and info from lower levels to higher levels, or to external components
#   such as HoneyBadger and Slack.
#
class LogCollector
  attr_reader :exceptions, :logs, :metrics, :task_name

  def initialize(task_name = nil)
    @task_name = task_name
    @exceptions = []  # rescued exceptions
    @logs = []
    @metrics = {}
  end

  # Execute a block and time it.
  # Save exception if caught, do not re-raise. Caller's flow will continue as normal.
  #
  # @param action_name [string] a friendly name of the block being executed
  # @param print_to_stdout [boolean]
  def time(action_name = nil, print_to_stdout = true)
    return unless block_given?
    start_time = Time.now

    yield

    info("#{action_name || 'Unnamed'} action completed without error in"\
      " #{self.class.get_friendly_time(Time.now - start_time)}.",
      print_to_stdout
    )
  rescue StandardError => e
    error("#{action_name || 'Unnamed'} action exited with error in"\
      " #{self.class.get_friendly_time(Time.now - start_time)}.",
      print_to_stdout
    )
    record_exception(e)
  end
  alias_method :time_and_continue, :time

  # Execute a block and time it.
  # Re-raise exception if caught, do not save. This will disrupt the caller's flow.
  #
  # @param action_name [string] friendly name for the given block
  # @param print_to_stdout [boolean]
  # @raise [StandardError] error encountered when executing the given block
  def time!(action_name = nil, print_to_stdout = true)
    return unless block_given?
    start_time = Time.now

    yield

    info("#{action_name || 'Unnamed'} action completed without error in"\
      " #{self.class.get_friendly_time(Time.now - start_time)}.",
      print_to_stdout
    )
  rescue StandardError
    error("#{action_name || 'Unnamed'} action exited with error in"\
      " #{self.class.get_friendly_time(Time.now - start_time)}. Exception re-raised!",
      print_to_stdout
    )

    # To be handled by caller
    raise
  end
  alias_method :time_and_raise!, :time!

  def info(message, print_to_stdout = true)
    logs << "[#{Time.now}] INFO: #{message}"
    CDO.log.info logs.last if print_to_stdout
  end

  def error(message, print_to_stdout = true)
    logs << "[#{Time.now}] ERROR: #{message}"
    CDO.log.info logs.last if print_to_stdout
  end

  def record_exception(e)
    exceptions << e
    error("Exception caught: #{e.inspect}. Stack trace:\n#{e.backtrace.join("\n")}")
  end

  # @param metrics [Hash]
  # @return [Hash]
  def record_metrics(metrics)
    @metrics.merge! metrics
  end

  def ok?
    exceptions.blank?
  end

  def last_message
    logs.last
  end

  def to_s
    exception_count = exceptions.length
    log_count = logs.length
    metric_count = metrics.length

    summary = "Task '#{task_name}' recorded "\
      "#{exception_count} #{'exception'.pluralize(exception_count)}, "\
      "#{log_count} #{'log message'.pluralize(log_count)}, "\
      "and #{metric_count} #{'metric'.pluralize(metric_count)}."

    # Return a summary and a detailed list of exceptions, logs and metrics.
    [
      summary,
      "#{exception_count} #{'exception'.pluralize(exception_count)}:",
      exceptions.map(&:message),
      "#{log_count} #{'log message'.pluralize(log_count)}:",
      logs,
      "#{metric_count} #{'metric'.pluralize(metric_count)}:",
      metrics
    ].flatten.join("\n")
  end
  alias_method :inspect, :to_s

  def self.get_friendly_time(value)
    "#{value.round(2)} seconds" if value.respond_to?(:round)
  end
end
