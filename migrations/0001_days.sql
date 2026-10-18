-- One row per day (Georgian time), one column per number: easy to read in the
-- Cloudflare dashboard (Storage & Databases > D1 > kai-chess-stats > days).
-- No ids, no addresses: only totals.
CREATE TABLE days (
  day TEXT PRIMARY KEY,
  -- browsers opening the site for the first time
  new_users INTEGER NOT NULL DEFAULT 0,
  -- browsers that opened the site that day
  active_users INTEGER NOT NULL DEFAULT 0,
  -- lesson levels finished
  lessons INTEGER NOT NULL DEFAULT 0,
  -- puzzles solved in the tactics stages and on the puzzles page
  puzzles INTEGER NOT NULL DEFAULT 0,
  -- class battles played to the end
  battles INTEGER NOT NULL DEFAULT 0,
  -- time challenges played to the end
  challenges INTEGER NOT NULL DEFAULT 0
);
