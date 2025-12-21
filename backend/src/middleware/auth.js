const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        // 🔑 SAFE access
        const token = req.cookies && req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = { id: decoded.userId };
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};
        