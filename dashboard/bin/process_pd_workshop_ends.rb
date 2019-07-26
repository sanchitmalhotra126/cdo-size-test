#!/usr/bin/env ruby
require_relative '../../lib/cdo/only_one'
require_relative '../config/environment'

# When a workshop is ended, we might need to send exit survey emails.  They need
# to be sent from production-daemon, and so we do it here.

def main
  Pd::Workshop.process_ends
end

main if only_one_running?(__FILE__)
