// middleware/auth.js

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Expecting the token in the format: 'Bearer <TOKEN>'
        const token = req.headers.authorization.split(' ')[1]; 
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication Failed: No Token Provided' });
        }
        
        // Verify the token using the secret key
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the decoded user data (userId and spotifyId) to the request
        req.userData = decodedToken;
        
        // Continue to the protected route handler
        next(); 

    } catch (error) {
        // This runs if jwt.verify fails (e.g., token is expired or invalid)
        return res.status(401).json({ 
            message: 'Authentication Failed: Invalid Token' 
        });
    }
};