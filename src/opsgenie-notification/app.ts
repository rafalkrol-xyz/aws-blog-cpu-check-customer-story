import axios, { Method } from 'axios'
import { Event } from '../types'

/**
 * Create an alarm in OpsGenie
 */
exports.handler = async (event: Event): Promise<void> => {
  const data = {
    message: `The ${event.InstanceId} EC2 instance is unresponsive`,
    alias: 'cpu-check-failed',
    description: `The CPU utilization of the ${event.InstanceId} reached 100%*, thus causing a CloudWatch alarm to ring.
The health check procedure kicked in and *the instance was restarted after having failed the ${event.failedInFirstRun} check.
That, unfortunately, did not help (the instance failed the ${event.failedInSecondRun} check) and is deemed unresponsive.
You must intervene!`,
    teams: [
      {
        id: process.env.TEAM_ID,
      },
    ],
    priority: process.env.PRIORITY, // defaults to P3: https://docs.opsgenie.com/docs/alert-api#create-alert
  }

  await axios({
    data,
    method: 'POST',
    url: Boolean(process.env.EU) === true ? 'https://api.eu.opsgenie.com/v2/alerts' : 'https://api.opsgenie.com/v2/alerts',
    headers: {
      'Authorization': `GenieKey ${process.env.API_KEY}`,
    },
  })

  console.log('The following alarm was successfully created in OpsGenie:', data)
}
