CREATE TABLE IF NOT EXISTS assistant_materials (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  file_id TEXT NOT NULL,
  mime TEXT NOT NULL,
  body TEXT NOT NULL,
  storage_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_materials_owner_file
  ON assistant_materials (owner_id, file_id);
