drop view analysis.csf_completed;
create view analysis.csf_completed as
select us.user_id, 
us.script_id, 
us.script_name,
us.school_year,
started_at as completed_at -- starting the Nth stage (dependent on script) representing "completing" the course
from
(
select us.user_id, sc.name script_name, script_id, stage_id, school_year, us.started_at::date, 
row_number() over(partition by us.user_id, us.script_id order by us.started_at asc) stage_order
from analysis.user_stages us
join dashboard_production.scripts sc on sc.id = us.script_id
join analysis.school_years sy on us.started_at between sy.started_at and sy.ended_at
) us
join analysis.csf_plugged_stage_counts sc on sc.script_id = us.script_id and us.stage_order = sc.plugged_stage_counts
with no schema binding;

GRANT ALL PRIVILEGES ON analysis.csf_completed TO GROUP admin;
GRANT SELECT ON analysis.csf_completed TO GROUP reader, GROUP reader_pii;
