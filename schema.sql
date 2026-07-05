-- One row per 2AFC choice. Created automatically on first write, but you can
-- run this by hand against your Neon/Postgres database if you prefer.

create table if not exists responses (
  id           bigserial primary key,
  session_id   text not null,
  rater_label  text,
  expertise    text,
  pair_id      text not null,
  case_id      text not null,
  model        text not null,
  triz_side    text not null,   -- 'left' | 'right' : where the TRIZ solution was shown
  chosen_side  text not null,   -- 'left' | 'right' : what the rater clicked
  chosen_arm   text not null,   -- 'triz' | 'control' : derived (chosen_side == triz_side)
  round_index  int,
  time_ms      int,             -- decision latency
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists responses_model_idx on responses (model);
create index if not exists responses_case_idx  on responses (case_id);

-- Example analysis: overall + per-model TRIZ win rate
--   select 'overall' as model, count(*) n,
--          avg((chosen_arm='triz')::int)::numeric(4,3) as triz_win_rate
--   from responses
--   union all
--   select model, count(*), avg((chosen_arm='triz')::int)::numeric(4,3)
--   from responses group by model order by 1;
