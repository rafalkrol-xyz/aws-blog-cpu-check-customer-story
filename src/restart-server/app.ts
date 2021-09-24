import { EC2Client, RebootInstancesCommand } from '@aws-sdk/client-ec2'
import { Event } from '../types'

/**
 * Reboots the EC2 instance
 */
 exports.handler = async (event: Event): Promise<Event> => {
  console.log(`Attempting a reboot of the ${event.InstanceId} instance`)
  const client = new EC2Client({})
  const params = {
    InstanceIds: [event.InstanceId],
  }
  const command = new RebootInstancesCommand(params)
  await client.send(command)

  delete event.checkPassed
  event.secondRun = true
  return event
}
