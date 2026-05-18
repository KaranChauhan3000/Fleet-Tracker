const { verifyToken } = require('../utils/jwt');

// Protects /family/* routes.
// Accepts both:
//   - family tokens  → req.family.trackedUserId = the user being tracked
//   - user tokens    → req.family.trackedUserId = themselves (employee viewing own timeline)
exports.protectFamily = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const decoded = verifyToken(auth.split(' ')[1]);

    if (decoded.role === 'family') {
      req.family = {
        trackedUserId: decoded.trackedUserId,
        companyId:     decoded.companyId,
        familyPhone:   decoded.familyPhone,
        familyName:    decoded.familyName,
      };
    } else if (decoded.role === 'user') {
      // Employee viewing their own timeline
      req.family = {
        trackedUserId: decoded.id,
        companyId:     decoded.companyId,
        familyPhone:   null,
        familyName:    null,
      };
    } else {
      return res.status(403).json({ message: 'Family access required' });
    }

    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
