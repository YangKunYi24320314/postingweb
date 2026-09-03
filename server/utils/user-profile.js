function toUser(row) {
  const user = {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    role: row.role,
  }

  if (Object.prototype.hasOwnProperty.call(row, 'phone')) {
    user.phone = maskPhone(row.phone)
    user.phoneBound = Boolean(row.phone)
  }
  if (Object.prototype.hasOwnProperty.call(row, 'email')) {
    user.email = maskEmail(row.email)
    user.emailBound = Boolean(row.email)
  }
  return user
}

function maskPhone(phone) {
  if (!phone) return null
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

function maskEmail(email) {
  if (!email) return null
  const [local, domain] = email.split('@')
  const prefix = local.length <= 1 ? '*' : `${local[0]}***`
  return `${prefix}@${domain}`
}

module.exports = { maskEmail, maskPhone, toUser }
