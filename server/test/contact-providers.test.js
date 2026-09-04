const test = require('node:test')
const assert = require('node:assert/strict')

const { createSmsProvider } = require('../services/sms-provider')
const { createEmailProvider } = require('../services/email-provider')

test('SMS provider sends the verification template with the generated code', async () => {
  const calls = []
  class FakeRequest {
    constructor(input) {
      Object.assign(this, input)
    }
  }
  const provider = createSmsProvider({
    client: {
      sendSms: async (request) => {
        calls.push(request)
        return { body: { code: 'OK', requestId: 'req-1' } }
      },
    },
    RequestClass: FakeRequest,
    config: {
      signName: '校园社区',
      templateCode: 'SMS_TEST',
    },
  })

  const result = await provider.sendCode({ target: '13800138000', code: '123456', purpose: 'bind' })

  assert.deepEqual(result, { requestId: 'req-1' })
  assert.deepEqual({ ...calls[0] }, {
    phoneNumbers: '13800138000',
    signName: '校园社区',
    templateCode: 'SMS_TEST',
    templateParam: '{"code":"123456"}',
  })
})

test('email provider sends a verification message through SMTP transport', async () => {
  const messages = []
  const provider = createEmailProvider({
    transport: {
      sendMail: async (message) => {
        messages.push(message)
        return { messageId: 'mail-1' }
      },
    },
    config: { from: 'Campus Hub <no-reply@example.com>' },
  })

  const result = await provider.sendCode({ target: 'user@example.com', code: '123456', purpose: 'password_reset' })

  assert.deepEqual(result, { messageId: 'mail-1' })
  assert.equal(messages[0].to, 'user@example.com')
  assert.match(messages[0].text, /123456/)
})

test('providers reject missing production configuration before sending', () => {
  assert.throws(() => createSmsProvider({ config: {} }), /阿里云短信配置不完整/)
  assert.throws(() => createEmailProvider({ config: {} }), /SMTP 配置不完整/)
})
