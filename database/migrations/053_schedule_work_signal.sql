begin;

drop trigger if exists cprofile_firecrawl_schedule_work_signal
  on tracker.cprofile_firecrawl_schedules;
create trigger cprofile_firecrawl_schedule_work_signal
after insert or update of next_trigger_at, enabled on tracker.cprofile_firecrawl_schedules
for each row execute function tracker.notify_work_available();

commit;
