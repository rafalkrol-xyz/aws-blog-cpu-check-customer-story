'use strict'

const { handler } = require('../../app.js')
const chai = require('chai')
const expect = chai.expect
const eventFirstRun = require('../../../../events/firstRunFailure.json')
const eventSecondRun = require('../../../../events/secondRunFailure.json')
const sandbox = require('sinon').createSandbox()
const { EC2Client } = require('@aws-sdk/client-ec2')
const { Client } = require('ssh2')
const { EventEmitter } = require('events');
const td = require('testdouble')

describe('Tests SSH Check', () => {
  before(() => {
    const result = {
      Reservations:
        [
          {
            Instances:
              [
                {
                  PublicIpAddress: 'signup.insomnia247.nl', // The check will usually pass as this URL is open for SSH connections (well, at least most of the times): https://signup.insomnia247.nl/
                  PrivateIpAddress: '8.8.8.8', // The check will fail
                }
              ]
          }
        ]
    }

    sandbox.stub(EC2Client.prototype, 'send').returns(result)
    const client = new EventEmitter()
    client.connect = td.func()

  })

  after(() => {
    sandbox.restore()
    td.reset()
  })

  it('Always returns an object with InstanceId, checkPassed and failedInFirstRun keys', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.be.an('object')
    expect(result).to.have.all.keys('InstanceId', 'checkPassed', 'failedInFirstRun')
  })

  it('When a given host is listening for SSH connections, checkPassed is set to true', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.have.a.property('checkPassed').that.is.true
  })

  it('When a given host is not listening for SSH connections, checkPassed is set to false', async () => {
    process.env['PRIVATE'] = 'true' // the mocked private IP (8.8.8.8) does not listen for SSH connections
    const result = await handler(eventFirstRun)

    expect(result).to.have.a.property('checkPassed').that.is.false
  })

  it('On first run, secondRun is not present', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.not.have.a.property('secondRun')
  })

  it('On second run, secondRun is set to true', async () => {
    const result = await handler(eventSecondRun)

    expect(result).to.have.a.property('secondRun').that.is.true
  })

  it('Correctly parses the environment variables', async () => {
    process.env['PRIVATE'] = 'false'
    process.env['SSH_HOST'] = 'google.com'
    process.env['SSH_PORT'] = '53'
    process.env['SSH_HANDSHAKE_TIMEOUT'] = '2000'
    const result = await handler(eventFirstRun)

    expect(result).to.be.ok
  })
})
