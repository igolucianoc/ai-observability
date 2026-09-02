// Test environment defaults so EnvService validation passes when the Nest app
// boots inside tests. No real services are contacted (repositories are
// overridden with in-memory fakes in the e2e helper).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-min-16-chars';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-min-16-chars';
process.env.JWT_ACCESS_TTL ??= '900';
process.env.JWT_REFRESH_TTL ??= '604800';
process.env.COOKIE_SECURE ??= 'false';
process.env.API_CORS_ORIGINS ??= 'http://localhost:3000';
process.env.LOG_LEVEL ??= 'error';
