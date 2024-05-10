const { BlacklistModel } = require("../Models/Blacklist");
const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
    const token = req.headers.authorization;

    // Default user type is 'user'
    req.userType = 'user';

    try {
        if (!token) {
            return res.status(401).json({ message: "Token is not provided. Please login." });
        }

        const blacklistedToken = await BlacklistModel.findOne({ blacklist: token });
        if (blacklistedToken) {
            return res.status(400).json({ message: "Please login again!" });
        }

        jwt.verify(token, process.env.SecretKey, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: "Invalid token. Please login again." });
            }

            if (decoded.userType === "admin") {
                req.userType = decoded.userType;
            }

            req.body.userId = decoded.userId;
            req.body.username = decoded.username;
            next();
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    auth
};
