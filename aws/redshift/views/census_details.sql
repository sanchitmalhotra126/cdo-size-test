create view analysis.census_details as
with csa as
(
select ss.school_id, case when cso.school_code is not null then 1 else 0 end as teaches_csa
from school_stats ss
left join ap_school_codes sc on sc.school_id = ss.school_id
left join ap_cs_offerings cso on cso.school_code = sc.school_code and cso.course = 'CSA'
where ss.school_type in ('public','charter') -- only include known status for public and charter schools, as we don't have data for private schools
),
csp as
(
select ss.school_id, case when cso.school_code is not null then 1 else 0 end as teaches_csp
from school_stats ss
left join ap_school_codes sc on sc.school_id = ss.school_id
left join ap_cs_offerings cso on cso.school_code = sc.school_code and cso.course = 'CSP'
where ss.school_type in ('public','charter') -- only include known status for public and charter schools, as we don't have data for private schools
),
census as 
(
select school_id,
max(case when how_many_do_hoc is null then null when how_many_do_hoc = 'I DON\'T KNOW' then null when how_many_do_hoc in ('SOME', 'ALL') then 1 else 0 end) hoc,
max(case when how_many_after_school is null then null when how_many_after_school = 'I DON\'T KNOW' then null when how_many_after_school in ('SOME', 'ALL') then 1 else 0 end) after_school
from census_submissions cs
join census_submissions_school_infos cssi on cssi.census_submission_id = cs.id
join school_infos si on si.id = cssi.school_info_id
where school_id is not null
group by 1
)
select ss.school_id, teaches_csa, teaches_csp, hoc, after_school
from school_stats ss
left join csp on csp.school_id = ss.school_id
left join csa on csa.school_id = ss.school_id
left join census cen on cen.school_id = ss.school_id;

GRANT ALL PRIVILEGES ON analysis.census_details TO GROUP admin;
GRANT SELECT ON analysis.census_details TO GROUP reader, GROUP reader_pii;
