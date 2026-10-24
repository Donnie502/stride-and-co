process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'stride-co';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'stride-co-api';
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || '4';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/stride_co_test';
