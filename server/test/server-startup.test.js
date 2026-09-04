const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const path = require('node:path')
const test = require('node:test')

test('server starts on a random port', async () => {
  const serverPath = path.join(__dirname, '..', 'server.js')
  const child = spawn(process.execPath, [serverPath], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`server startup timed out; output: ${output}`))
    }, 15000)

    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
      if (output.includes('Server is running on port')) {
        clearTimeout(timeout)
        child.kill()
        resolve('started')
      }
    })
    child.stderr.on('data', (chunk) => {
      output += chunk.toString()
    })
    child.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.once('exit', (code, signal) => {
      if (code !== 0 && !output.includes('Server is running on port')) {
        clearTimeout(timeout)
        reject(new Error(`server exited with ${code ?? signal}; output: ${output}`))
      }
    })
  })

  assert.equal(result, 'started')
})
