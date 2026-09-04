const nodemailer = require('nodemailer')

function providerError(message, cause) {
  const error = new Error(message)
  error.code = 'CONTACT_PROVIDER'
  if (cause) error.cause = cause
  return error
}

function createEmailProvider({ transport, config = process.env } = {}) {
  const host = config.host || config.SMTP_HOST
  const port = Number(config.port || config.SMTP_PORT || 465)
  const user = config.user || config.SMTP_USER
  const password = config.password || config.SMTP_PASSWORD
  const from = config.from || config.SMTP_FROM

  if (!transport && (!host || !user || !password || !from)) {
    throw providerError('SMTP 配置不完整')
  }

  if (!transport) {
    transport = nodemailer.createTransport({
      host,
      port,
      secure: String(config.secure || config.SMTP_SECURE || port === 465) === 'true',
      auth: { user, pass: password },
    })
  }

  return {
    async sendCode({ target, code, purpose }) {
      try {
        const result = await transport.sendMail({
          from,
          to: target,
          subject: purpose === 'password_reset' ? '校园社区密码重置验证码' : '校园社区绑定验证码',
          text: `你的校园社区验证码是 ${code}，5 分钟内有效。如非本人操作，请忽略此邮件。`,
        })
        return { messageId: result?.messageId || null }
      } catch (error) {
        throw providerError('验证码发送失败', error)
      }
    },
  }
}

module.exports = { createEmailProvider }
