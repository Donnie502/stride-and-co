const bcrypt = require('bcrypt');
const config = require('config');

async function hashPassword(password) {
    const saltKey = await bcrypt.genSalt(config.get('bcrypt.saltRounds'));
    const passwordHash = await bcrypt.hash(password, saltKey);

    return { password_hash: passwordHash, salt_key: saltKey };
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

module.exports = { hashPassword, verifyPassword };