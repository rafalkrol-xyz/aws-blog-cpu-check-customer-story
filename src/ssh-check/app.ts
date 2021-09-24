'use strict'

import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2'
import { Client } from 'ssh2'
import { Event } from '../types'

exports.handler = async (event: Event): Promise<Event> => {
  console.log(`Starting the ${event.secondRun ? 'second' : 'first'} run of the SSH check`)

  let host = process.env.SSH_HOST
  if (!host) {
    const client = new EC2Client({})
    const params = {
      InstanceIds: [event.InstanceId],
    }
    const command = new DescribeInstancesCommand(params)
    const { Reservations: [{ Instances: [{ PublicIpAddress, PrivateIpAddress }] }] } = await client.send(command)
    host = <boolean | undefined>process.env.PRIVATE ? PrivateIpAddress : PublicIpAddress
  }

  return new Promise(resolve => {
    const conn = new Client()
    conn.on('error', (err) => {
      if (err.level === 'client-authentication') {
        console.log(`On its ${event.secondRun ? 'second' : 'first'} run, the SSH check passed`)
        console.log(`Moving on to the ${event.secondRun ? 'Slack Notification' : 'All good'} step`)
        event.checkPassed = true
      } else {
        console.error(`On its ${event.secondRun ? 'second' : 'first'} run, the SSH check failed with the following erro: ${err}`)
        console.log(`Moving on to the ${event.secondRun ? 'OpsGenie Notification' : 'Server Restart'} step`)
        event.checkPassed = false
      }
      resolve(event)
    }).connect({
      host,
      port: Number(process.env.SSH_PORT) || 22,
      username: 'aUsernameThatDoesNotExist',
      readyTimeout: Number(process.env.SSH_HANDSHAKE_TIMEOUT) || 5000, // NB must be smaller than the function's timeout
    })
  })
}
