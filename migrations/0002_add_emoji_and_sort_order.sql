-- Cloudflare D1 Database Migration: Add emoji and sort_order
-- Migration: 0002_add_emoji_and_sort_order.sql

ALTER TABLE books ADD COLUMN emoji TEXT DEFAULT '📖';
ALTER TABLE books ADD COLUMN sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_books_sort_order ON books(sort_order ASC);
