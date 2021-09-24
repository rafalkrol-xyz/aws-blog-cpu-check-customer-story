import { WebClient } from '@slack/web-api'
import { Event } from '../types'

/**
 * Posts a message to a given Slack channel
 */
exports.handler = async (event: Event): Promise<void> => {
  const text = `*The CPU utilization of the ${event.InstanceId} reached 100%*, thus causing a CloudWatch alarm to ring.
The health check procedure kicked in and *the instance was restarted after having failed the ${event.failedInFirstRun} check*.
You may relax now as *its CPU levels are back to normal* and all is well in the world again.`

  const client = new WebClient(process.env.SLACK_TOKEN)

  if (!process.env.SLACK_CHANNEL_ID) {
    throw new Error('The environment variable SLACK_CHANNEL_ID must be set!')
  }

  await client.chat.postMessage({
    text,
    channel: process.env.SLACK_CHANNEL_ID,
  })

  console.log(`The following message was successfully posted to the designated Slack channel: \n${text}`)
}
