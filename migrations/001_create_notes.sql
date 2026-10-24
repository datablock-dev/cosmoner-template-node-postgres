-- Migrations run in file name order, each once, inside a transaction.
-- Add a change as a new file (002_..., 003_...) rather than editing this one.
CREATE TABLE notes (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
