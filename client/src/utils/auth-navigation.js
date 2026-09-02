export function getAuthAction(token) {
  return token
    ? { label: '个人中心', path: '/profile' }
    : { label: '登录', path: '/login' }
}

export function logout({ clearToken, navigate }) {
  clearToken()
  navigate('/login')
}
