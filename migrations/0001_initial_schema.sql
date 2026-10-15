-- Cloudflare D1 Database Initial Schema
-- Migration: 0001_initial_schema.sql

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT '전담교과',
  pdf_key TEXT NOT NULL,
  cover_key TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  page_count INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_books_published ON books(is_published);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);

-- Initial Seed Data: CREATE Model Unit Design Collection
INSERT OR IGNORE INTO books (id, title, description, category, pdf_key, cover_key, file_size, page_count, is_published) VALUES
('create-doc-1', 'CREATE 수업설계 모형 길잡이', '미래학교 프로젝트 실증수업 지도안: CREATE 수업설계 모형 길잡이 자료입니다.', '수업설계 길잡이', 'books/create-doc-1/document.pdf', 'covers/create-doc-1/cover.jpg', 4786542, 36, 1),
('create-doc-2', 'CREATE모형 단원설계안(1학년)', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안(1학년)', '1·2학년', 'books/create-doc-2/document.pdf', 'covers/create-doc-2/cover.jpg', 158414, 8, 1),
('create-doc-3', 'CREATE모형 단원설계안(2학년)', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안(2학년)', '1·2학년', 'books/create-doc-3/document.pdf', 'covers/create-doc-3/cover.jpg', 519107, 10, 1),
('create-doc-4', 'CREATE모형 단원설계안_통합 전담수업_2학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_통합 전담수업_2학년', '전담교과', 'books/create-doc-4/document.pdf', 'covers/create-doc-4/cover.jpg', 162009, 8, 1),
('create-doc-5', 'CREATE모형 단원설계안(3학년)', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안(3학년)', '3·4학년', 'books/create-doc-5/document.pdf', 'covers/create-doc-5/cover.jpg', 182725, 9, 1),
('create-doc-6', 'CREATE모형 단원설계안(4학년)', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안(4학년)', '3·4학년', 'books/create-doc-6/document.pdf', 'covers/create-doc-6/cover.jpg', 2264015, 12, 1),
('create-doc-7', 'CREATE모형 단원설계안_영어 전담수업_4학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_영어 전담수업_4학년', '전담교과', 'books/create-doc-7/document.pdf', 'covers/create-doc-7/cover.jpg', 161755, 8, 1),
('create-doc-8', 'CREATE모형 단원설계안_체육 전담수업_4학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_체육 전담수업_4학년', '전담교과', 'books/create-doc-8/document.pdf', 'covers/create-doc-8/cover.jpg', 143598, 8, 1),
('create-doc-9', 'CREATE모형 단원설계안(5학년)', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안(5학년)', '5·6학년', 'books/create-doc-9/document.pdf', 'covers/create-doc-9/cover.jpg', 334709, 10, 1),
('create-doc-10', 'CREATE모형 단원설계안_과학 전담수업_5학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_과학 전담수업_5학년', '전담교과', 'books/create-doc-10/document.pdf', 'covers/create-doc-10/cover.jpg', 160590, 8, 1),
('create-doc-11', 'CREATE모형 단원설계안_영어 전담수업_5학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_영어 전담수업_5학년', '전담교과', 'books/create-doc-11/document.pdf', 'covers/create-doc-11/cover.jpg', 133150, 8, 1),
('create-doc-12', 'CREATE모형 단원설계안_보건_5학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_보건_5학년', '전담교과', 'books/create-doc-12/document.pdf', 'covers/create-doc-12/cover.jpg', 97790, 6, 1),
('create-doc-13', 'CREATE모형 단원설계안(6학년)', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안(6학년)', '5·6학년', 'books/create-doc-13/document.pdf', 'covers/create-doc-13/cover.jpg', 307092, 10, 1),
('create-doc-14', 'CREATE모형 단원설계안_과학 전담수업_6학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_과학 전담수업_6학년', '전담교과', 'books/create-doc-14/document.pdf', 'covers/create-doc-14/cover.jpg', 136010, 8, 1),
('create-doc-15', 'CREATE모형 단원설계안_영어 전담수업_6학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_영어 전담수업_6학년', '전담교과', 'books/create-doc-15/document.pdf', 'covers/create-doc-15/cover.jpg', 156506, 8, 1),
('create-doc-16', 'CREATE모형 단원설계안_체육 전담수업_6학년', '미래학교 프로젝트 실증수업 지도안: CREATE모형 단원설계안_체육 전담수업_6학년', '전담교과', 'books/create-doc-16/document.pdf', 'covers/create-doc-16/cover.jpg', 123432, 8, 1);
