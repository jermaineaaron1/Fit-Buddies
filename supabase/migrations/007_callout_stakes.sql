-- Stipulations: what's on the line for a callout (e.g. "Loser buys smoothies").
alter table callouts add column if not exists stakes text;
