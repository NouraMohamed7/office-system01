// src/types/library.ts

export type LibraryDepartment = "social_media" | "representative" | "sells" | "else";
export type LibraryContentType = "video" | "link" | "file" | "text_guide" | "else";

export interface LibraryItem {
  id: number;
  title: string;
  name: string;
  department: LibraryDepartment;
  content: LibraryContentType;
  link: string | null;
  description: string | null;
  file_path: string | null;
  storage_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}