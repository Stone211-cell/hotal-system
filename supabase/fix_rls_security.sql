-- ============================================================
-- FIX: Enable Row-Level Security (RLS) on ALL public tables
-- ============================================================
-- 
-- WHY THIS IS NEEDED:
-- Supabase exposes a REST API (PostgREST) using the anon key.
-- Without RLS, ANYONE with your project URL can read/write ALL data
-- through that REST API — even without authentication.
--
-- HOW THIS FIX WORKS:
-- 1. Enable RLS on every table → blocks all anon/authenticated REST access by default
-- 2. No SELECT/INSERT/UPDATE/DELETE policies are added → no one can access via REST API
-- 3. Your app uses Prisma with the postgres superuser connection string,
--    which BYPASSES RLS entirely → your app continues working normally
--
-- IMPORTANT: Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- =====================
-- Core Hotel Tables
-- =====================

-- Hotel (โรงแรม/ผู้เช่าระบบ)
ALTER TABLE "Hotel" ENABLE ROW LEVEL SECURITY;

-- HotelMember (พนักงานและเจ้าของโรงแรม)
ALTER TABLE "HotelMember" ENABLE ROW LEVEL SECURITY;

-- RoomType (ประเภทห้องพัก)
ALTER TABLE "RoomType" ENABLE ROW LEVEL SECURITY;

-- Room (ห้องพัก)
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;

-- Guest (ข้อมูลลูกค้า/ผู้เช่า)
ALTER TABLE "Guest" ENABLE ROW LEVEL SECURITY;

-- =====================
-- Booking System Tables
-- =====================

-- Booking (การจอง)
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;

-- Payment (การชำระเงิน)
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- =====================
-- Financial Tables
-- =====================

-- Expense (รายจ่าย)
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;

-- =====================
-- Dormitory/Apartment Tables
-- =====================

-- Contract (สัญญาเช่าหอพัก)
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;

-- Bill (บิลรายเดือน)
ALTER TABLE "Bill" ENABLE ROW LEVEL SECURITY;

-- =====================
-- Maintenance & System Tables
-- =====================

-- RoomMaintenance (การดูแลรักษาและแจ้งซ่อม)
ALTER TABLE "RoomMaintenance" ENABLE ROW LEVEL SECURITY;

-- SystemFeedback (ความคิดเห็น/คำแนะนำ)
ALTER TABLE "SystemFeedback" ENABLE ROW LEVEL SECURITY;

-- =====================
-- Prisma Internal Tables
-- =====================

-- Prisma migrations table (if exists)
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICATION: Run this query after enabling RLS to confirm
-- ============================================================
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public';
--
-- All tables should show rowsecurity = true
-- ============================================================
