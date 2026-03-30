-- FTS5 schema for PAI session search
-- Enables full-text search across Claude Code conversation history

-- Main conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    project TEXT,
    role TEXT,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(
    content,
    session_id,
    project,
    role,
    content='conversations',
    content_rowid='id',
    tokenize='porter unicode61'  -- Porter stemmer + Unicode support
);

-- Triggers to keep FTS in sync with main table
CREATE TRIGGER IF NOT EXISTS conversations_ai AFTER INSERT ON conversations BEGIN
    INSERT INTO conversations_fts(rowid, content, session_id, project, role)
    VALUES (new.id, new.content, new.session_id, new.project, new.role);
END;

CREATE TRIGGER IF NOT EXISTS conversations_ad AFTER DELETE ON conversations BEGIN
    INSERT INTO conversations_fts(conversations_fts, rowid, content, session_id, project, role)
    VALUES ('delete', old.id, old.content, old.session_id, old.project, old.role);
END;

CREATE TRIGGER IF NOT EXISTS conversations_au AFTER UPDATE ON conversations BEGIN
    INSERT INTO conversations_fts(conversations_fts, rowid, content, session_id, project, role)
    VALUES ('delete', old.id, old.content, old.session_id, old.project, old.role);
    INSERT INTO conversations_fts(rowid, content, session_id, project, role)
    VALUES (new.id, new.content, new.session_id, new.project, new.role);
END;

-- Index for faster session_id lookups
CREATE INDEX IF NOT EXISTS idx_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_project ON conversations(project);
