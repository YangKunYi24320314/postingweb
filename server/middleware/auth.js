const jwt = require('jsonwebtoken');

function sendError(res, httpStatus, code, message) {
  return res.status(httpStatus).json({
    code,
    message,
    data: null,
  });
}

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return sendError(res, 401, 1002, '请先登录');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'campushub-dev-secret');
    const userId = payload && (payload.id || payload.userId || payload.sub);

    if (!userId || Number.isNaN(Number(userId))) {
      return sendError(res, 401, 1002, 'Token无效');
    }

    req.user = {
      id: Number(userId),
      role: payload.role || 'user',
    };

    return next();
  } catch (error) {
    return sendError(res, 401, 1002, 'Token无效');
  }
}

module.exports = {
  requireAuth,
};
