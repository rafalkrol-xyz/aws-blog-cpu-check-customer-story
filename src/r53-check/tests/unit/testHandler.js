'use strict'

const { handler } = require('../../app.js')
const chai = require('chai')
const expect = chai.expect
const eventFirstRun = require('../../../../events/firstRunFailure.json')
const eventSecondRun = require('../../../../events/secondRunFailure.json')
const sandbox = require('sinon').createSandbox()
const { Route53Client } = require('@aws-sdk/client-route-53')

describe('Tests a successful Route53 Check', () => {
  beforeEach(() => {
    const success = {
      HealthCheckObservations:
        [
          {
            Region: 'us-west-1',
            IPAddress: '15.177.10.53',
            StatusReport: {
              Status: 'Success: HTTP Status Code 301, Moved Permanently. Resolved IP: 13.35.125.55',
              CheckedTime: '2021-01-26T15:59:48.911Z'
            }
          },
          {
            Region: 'ap-southeast-2',
            IPAddress: '15.177.62.53',
            StatusReport: {
              Status: 'Success: HTTP Status Code 301, Moved Permanently. Resolved IP: 13.227.73.39',
              CheckedTime: '2021-01-26T15:59:42.936Z'
            }
          },
        ]
    }

    sandbox.stub(Route53Client.prototype, 'send').returns(success)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('Returns an object with InstanceId, checkPassed and failedInFirstRun keys', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.be.an('object')
    expect(result).to.have.all.keys('InstanceId', 'checkPassed', 'failedInFirstRun')
  })

  it('The checkPassed key is set to true', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.have.a.property('checkPassed').that.is.true
  })

  it('On second run, the secondRun key is set to true', async () => {
    const result = await handler(eventSecondRun)

    expect(result).to.have.a.property('secondRun').that.is.true
  })
})

describe('Tests a failed URL Health Check', () => {
  beforeEach(() => {
    const failure = {
      HealthCheckObservations: [
        {
          Region: 'us-west-2',
          IPAddress: '15.177.18.53',
          StatusReport: {
            Status: 'Failure: DNS resolution failed: Rcode NXDomain(3)',
            CheckedTime: '2021-01-30T15:29:32.605Z'
          }
        },
        {
          Region: 'ap-southeast-1',
          IPAddress: '15.177.54.53',
          StatusReport: {
            Status: 'Failure: DNS resolution failed: Rcode NXDomain(3)',
            CheckedTime: '2021-01-30T15:29:33.814Z'
          }
        },
      ]
    }

    sandbox.stub(Route53Client.prototype, 'send').returns(failure)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('Returns an object with InstanceId, checkPassed and failedInFirstRun keys', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.be.an('object')
    expect(result).to.have.all.keys('InstanceId', 'checkPassed', 'failedInFirstRun')
  })

  it('The checkPassed key is set to false', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.have.a.property('checkPassed').that.is.false
  })

  it('On second run, the secondRun key is set to true', async () => {
    const result = await handler(eventSecondRun)

    expect(result).to.have.a.property('secondRun').that.is.true
  })
})
