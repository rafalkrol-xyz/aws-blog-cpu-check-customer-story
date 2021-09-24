import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2'
import axios, { Method } from 'axios'
import { Event } from '../types'

/**
 * Extract Instance ID from the event and verify via HTTP(S) whether it is reachable
 */
exports.handler = async (event: Event): Promise<Event> => {
  console.log(`Starting the ${event.secondRun ? 'second' : 'first'} run of the URL health check`)

  let url = process.env.URL
  if (!url) {
    const client = new EC2Client({})
    const params = {
      InstanceIds: [event.InstanceId],
    }
    const command = new DescribeInstancesCommand(params)
    const { Reservations: [{ Instances: [{ PublicIpAddress, PrivateIpAddress }] }] } = await client.send(command)

    url = `${Boolean(process.env.HTTPS) === true ? 'https' : 'http'}://${Boolean(process.env.PRIVATE) === true ? PrivateIpAddress : PublicIpAddress}${process.env.HEALTH_CHECK_URI ? process.env.HEALTH_CHECK_URI : ''}`
  }
  const method = process.env.METHOD ? <Method>process.env.METHOD : <Method>'GET'
  const timeout = process.env.TIMEOUT ? Number(process.env.TIMEOUT) : 3000

  try {
    console.log(`Attempting a ${method} request on ${url} with a timeout of ${timeout} milliseconds`)
    await axios({
      method,
      url,
      timeout,
    })
  } catch (e) {
    console.error(`On its ${event.secondRun ? 'second' : 'first'} run, the URL check failed with the following error:`, e)
    console.log(`Moving on to the ${event.secondRun ? 'OpsGenie Notification' : 'Server Restart'} step`)
    event.checkPassed = false
    return event
  }

  console.log(`On its ${event.secondRun ? 'second' : 'first'} run, the URL check succeeded`)
  console.log('Moving on to the Route53 Check step')
  event.checkPassed = true
  return event
}
