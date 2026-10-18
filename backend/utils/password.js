const bcrypt = require('bcrypt');

async function hashPassword(password) {
    const saltKey = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10);
    const securePassword = await bcrypt.hash(password, saltKey);

    return {securePassword, saltKey}
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

module.exports = { hashPassword, verifyPassword };