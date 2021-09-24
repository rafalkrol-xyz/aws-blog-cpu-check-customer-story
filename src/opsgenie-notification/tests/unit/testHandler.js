'use strict'

const { handler } = require('../../app.js')
const chai = require('chai')
const expect = chai.expect
const eventSecondRun = require('../../../../events/secondRunFailure.json')
const moxios = require('moxios')

describe('Tests OpsGenie Notification', () => {
  beforeEach(() => {
    moxios.install()
    moxios.stubRequest('https://api.eu.opsgenie.com/v2/alerts', {})
    moxios.stubRequest('https://api.opsgenie.com/v2/alerts', {})
  })

  afterEach(() => {
    moxios.uninstall()
  })

  it('Returns void', async () => {    
    const result = await handler(eventSecondRun)

    expect(result).to.be.undefined
  })
})
