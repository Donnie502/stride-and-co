const { User } = require('../models/relationals');
const { verifyPassword } = require('../utils/password');
const jwt = require('jsonwebtoken')
const {secret, expiresIn, issuer, audience } = require('../config/jwt');

//const INVALID_CREDENTIALS = { message: 'Invalid credentials' };

function signToken(user) {
    const jwtOptions = {
        expiresIn : expiresIn,
        issuer: issuer,
        audience: audience,
        algorithm: "HS256"
    };

    return jwt.sign({ sub: String(user.id)}, secret, jwtOptions);
}

async function login(req, res, next) {
    try {
        const {email, password} = req.body;

        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
        }
    
        const user = await User.findOne({ where: { email } });
        if (!user || !user.active) return res.status(401).json({ 
            message: req.__('auth.invalidCredentials') 
        });

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) return res.status(401).json({ 
            message: req.__('auth.invalidCredentials') 
        });

        const token = signToken(user);

        res.json({
            message: 'Login successful',
            data: {
                user,
                token
            }
    });
    } catch (err) {
        next(err)
    }
};


function me(req, res) {
  const { id, first_name, last_name, email, role_id, active } = req.user;
  res.json({ id, first_name, last_name, email, role_id, active });
}

module.exports = { login, me };