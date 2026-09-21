/** Runs before every test file: point the app at the throwaway test database. */
process.env.DATABASE_URL = "file:./test.db";
process.env.SESSION_SECRET = "test-session-secret-0123456789abcdef0123456789";
process.env.SHEAF_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.SHEAF_MODE = "demo";
process.env.WORKER_MODE = "off";
