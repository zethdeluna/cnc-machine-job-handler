export const config = {
	port: parseInt(process.env.PORT ?? '3001', 10),
	databaseUrl: process.env.DATABASE_URL ?? '',
	redisUrl: process.env.REDIS_URL ?? '',
	nodeEnv: process.env.NODE_ENV ?? 'development'
}