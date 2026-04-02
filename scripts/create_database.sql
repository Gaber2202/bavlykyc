-- =============================================================================
-- One-time: create database bavly_kyc (local PostgreSQL, default superuser)
-- =============================================================================
-- Connect as postgres, then:
--
--   psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -f scripts/create_database.sql
--
-- Default login is often user postgres / password you set at install. If the DB
-- already exists, you can ignore the error.
--
-- Then use in backend/.env:
--   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bavly_kyc
-- and run:  ./scripts/apply_db_schema.sh
-- =============================================================================

CREATE DATABASE bavly_kyc OWNER postgres;
