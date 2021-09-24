'use strict'

const { handler } = require('../../app.js')
const chai = require('chai')
const expect = chai.expect
const eventFirstRun = require('../../../../events/firstRunFailure.json')
const sandbox = require('sinon').createSandbox()
const { EC2Client } = require('@aws-sdk/client-ec2')

describe('Tests Restart Server', () => {
  before(() => {
    sandbox.stub(EC2Client.prototype, 'send').returns({})
  })

  after(() => {
    sandbox.restore()
  })

  it('Always returns an object with InstanceId, secondRun and failedInFirstRun keys', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.be.an('object')
    expect(result).to.have.all.keys('InstanceId', 'secondRun', 'failedInFirstRun')
  })

  it('The returned secondRun property is always set to true', async () => {
    const result = await handler(eventFirstRun)

    expect(result).to.have.a.property('secondRun').that.is.true
  })
})
