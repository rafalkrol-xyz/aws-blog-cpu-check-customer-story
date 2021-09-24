import { Route53Client, GetHealthCheckStatusCommand } from '@aws-sdk/client-route-53'
import { Event } from '../types'

/**
 * Extract Instance ID from the event and verify via HTTP(S) whether it is reachable
 */
exports.handler = async (event: Event): Promise<Event> => {
  console.log(`Starting the ${event.secondRun ? 'second' : 'first'} run of the Route53 check`)

  const client = new Route53Client({})
  const params = {
    HealthCheckId: process.env.R53_HEALTH_CHECK_ID,
  }
  const command = new GetHealthCheckStatusCommand(params)
  const { HealthCheckObservations } = await client.send(command)

  for (const { StatusReport: { Status } } of HealthCheckObservations) {
    if (Status.toLowerCase().includes('fail')) {
      console.error(`On its ${event.secondRun ? 'second' : 'first'} run, the Route53 check failed with the following status: ${Status}`)
      console.log(`Moving on to the ${event.secondRun ? 'OpsGenie Notification' : 'Server Restart'} step`)
      event.checkPassed = false
      return event
    }
  }

  console.log(`On its ${event.secondRun ? 'second' : 'first'} run, the Route53 check passed`)
  console.log('Moving on to the SSH Check step')
  event.checkPassed = true
  return event
}
