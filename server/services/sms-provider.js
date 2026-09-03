const AliyunSmsClient = require('@alicloud/dysmsapi20170525').default
const { SendSmsRequest } = require('@alicloud/dysmsapi20170525')
const { Config } = require('@alicloud/openapi-client')

function providerError(message, cause) {
  const error = new Error(message)
  error.code = 'CONTACT_PROVIDER'
  if (cause) error.cause = cause
  return error
}

function createSmsProvider({ client, RequestClass = SendSmsRequest, config = process.env } = {}) {
  const signName = config.signName || config.ALIYUN_SMS_SIGN_NAME
  const templateCode = config.templateCode || config.ALIYUN_SMS_TEMPLATE_CODE

  if (!client) {
    const accessKeyId = config.accessKeyId || config.ALIYUN_ACCESS_KEY_ID
    const accessKeySecret = config.accessKeySecret || config.ALIYUN_ACCESS_KEY_SECRET
    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
      throw providerError('阿里云短信配置不完整')
    }
    client = new AliyunSmsClient(
      new Config({
        accessKeyId,
        accessKeySecret,
        endpoint: config.endpoint || config.ALIYUN_SMS_ENDPOINT || 'dysmsapi.aliyuncs.com',
      })
    )
  }

  if (!signName || !templateCode) {
    throw providerError('阿里云短信配置不完整')
  }

  return {
    async sendCode({ target, code }) {
      try {
        const response = await client.sendSms(
          new RequestClass({
            phoneNumbers: target,
            signName,
            templateCode,
            templateParam: JSON.stringify({ code }),
          })
        )
        const body = response?.body || response || {}
        if (body.code !== 'OK') throw new Error(body.message || '阿里云短信返回失败')
        return { requestId: body.requestId || null }
      } catch (error) {
        if (error.code === 'CONTACT_PROVIDER') throw error
        throw providerError('验证码发送失败', error)
      }
    },
  }
}

module.exports = { createSmsProvider }
