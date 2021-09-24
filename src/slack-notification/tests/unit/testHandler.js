'use strict'

const { handler } = require('../../app.js')
const chai = require('chai')
const expect = chai.expect
const eventSecondRun = require('../../../../events/secondRunSuccess.json')
const { WebClient } = require('@slack/web-api')

describe('Tests a successful URL Health Check', () => {
  beforeEach(() => {
    // FIXME: mock Slack's web client and write some tests!
  })

  afterEach(() => {
  })

  it('Returns void', async () => {
    console.log('No tests...')
  })
})
