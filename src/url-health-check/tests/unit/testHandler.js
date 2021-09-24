'use strict'

const { handler } = require('../../app.js')
const chai = require('chai')
const expect = chai.expect
const eventFirstRun = require('../../../../events/startOfFirstRun.json')
const eventSecondRun = require('../../../../events/startOfSecondRun.json')
const sandbox = require('sinon').createSandbox()
const { EC2Client } = require('@aws-sdk/client-ec2')

describe('Tests URL Health Check', () => {
  before(() => {
    const result = {
      Reservations:
        [
          {
            Instances:
              [
                {
                  PublicIpAddress: '1.1.1.1', // GET request to this IP address will be successful both over HTTP and HTTPS
                  PrivateIpAddress: '8.8.8.8', // GET request to this IP address will timeout
                }
              ]
          }
        ]
    }

    sandbox.stub(EC2Client.prototype, 'send').returns(result)
  })

  after(() => {
    sandbox.restore()
  })

  it('Always returns an object with InstanceId and checkPassed keys', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.be.an('object')
    expect(result).to.have.all.keys('InstanceId', 'checkPassed')
  })

  it('When an endpoint is reachable, checkPassed is set to true', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.have.a.property('checkPassed').that.is.true
  })

  it('When an endpoint is unreachable, checkPassed is set to false', async () => {
    process.env['PRIVATE'] = true // the mocked private IP (8.8.8.8) is unreachable
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
    process.env['HTTPS'] = 'true'
    process.env['PRIVATE'] = 'true'
    process.env['HEALTH_CHECK_URI'] = ''
    process.env['METHOD'] = 'OPTIONS'
    process.env['TIMEOUT'] = '2000'
    const result = await handler(eventFirstRun)

    expect(result).to.be.ok
  })
})
