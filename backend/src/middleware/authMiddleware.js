const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Bearer <token>
        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'secretkey');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
