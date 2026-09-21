/** Runs before every test file: point the app at the throwaway test database. */
process.env.DATABASE_URL = "file:./test.db";
process.env.SESSION_SECRET = "test-session-secret-0123456789abcdef0123456789";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3200";
process.env.RATE_LIMIT = "off";
