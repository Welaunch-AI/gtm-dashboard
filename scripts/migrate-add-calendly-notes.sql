-- Migration: add calendly_notes column to crm_contacts
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS calendly_notes text;
