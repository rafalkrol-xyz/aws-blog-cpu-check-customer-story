#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import { StateMachineStack } from '../lib/state-machine-stack'
import { LambdaStack } from '../lib/lambda-stack'
import { MetricAlarmRuleStack } from '../lib/metric-alarm-rule-stack'
import { repository, version } from '../package.json'
import { SLACK_TOKEN, SLACK_CHANNEL_ID, TEAM_ID, API_KEY, R53_HEALTH_CHECK_ID } from '../config'

if (!SLACK_TOKEN) {
  throw new Error('SLACK_TOKEN must be set!')
}
if (!SLACK_CHANNEL_ID) {
  throw new Error('SLACK_CHANNEL_ID must be set!')
}
if (!TEAM_ID) {
  throw new Error('TEAM_ID must be set!')
}
if (!API_KEY) {
  throw new Error('API_KEY must be set!')
}
if (!R53_HEALTH_CHECK_ID) {
  throw new Error('R53_HEALTH_CHECK_ID must be set!')
}

const app = new cdk.App()

const regionInstanceMap: Map<string, string> = app.node.tryGetContext('regionInstanceMap')

const tags = {
  version,
  repositoryUrl: repository.url,
}

for (const [region, instanceId] of Object.entries(regionInstanceMap)) {
  const env = {
    region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  }

  const lambdaStackUrlHealthCheck = new LambdaStack(app, `LambdaStackUrlHealthCheck-${region}`, {
    tags,
    env,
    name: 'url-health-check',
    policyStatementProps: {
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['ec2:DescribeInstances'],
    },
  })

  const lambdaStackR53Check = new LambdaStack(app, `LambdaStackR53Check-${region}`, {
    tags,
    env,
    name: 'r53-check',
    policyStatementProps: {
      effect: iam.Effect.ALLOW,
      resources: [`arn:aws:route53:::healthcheck/${R53_HEALTH_CHECK_ID}`],
      actions: ['route53:GetHealthCheckStatus'],
    },
    environment: {
      R53_HEALTH_CHECK_ID,
    },
  })

  const lambdaStackSshCheck = new LambdaStack(app, `LambdaStackSshCheck-${region}`, {
    tags,
    env,
    name: 'ssh-check',
    policyStatementProps: {
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['ec2:DescribeInstances'],
    },
  })

  const lambdaStackRestartServer = new LambdaStack(app, `LambdaStackRestartServer-${region}`, {
    tags,
    env,
    name: 'restart-server',
    policyStatementProps: {
      effect: iam.Effect.ALLOW,
      resources: [`arn:aws:ec2:${region}:${process.env.CDK_DEFAULT_ACCOUNT}:instance/${instanceId}`],
      actions: ['ec2:RebootInstances'],
    },
  })

  const lambdaStackSlackNotification = new LambdaStack(app, `LambdaStackSlackNotification-${region}`, {
    tags,
    env,
    name: 'slack-notification',
    environment: {
      SLACK_TOKEN,
      SLACK_CHANNEL_ID,
    },
  })

  const lambdaStackOpsGenieNotification = new LambdaStack(app, `LambdaStackOpsGenieNotification-${region}`, {
    tags,
    env,
    name: 'opsgenie-notification',
    environment: {
      TEAM_ID,
      API_KEY,
      EU: 'true',
    },
  })

  const stateMachineStack = new StateMachineStack(app, `StateMachineStack-${region}`, {
    tags,
    env,
    urlHealthCheck: lambdaStackUrlHealthCheck.lambdaFunction,
    r53Check: lambdaStackR53Check.lambdaFunction,
    sshCheck: lambdaStackSshCheck.lambdaFunction,
    restartServer: lambdaStackRestartServer.lambdaFunction,
    slackNotification: lambdaStackSlackNotification.lambdaFunction,
    opsGenieNotification: lambdaStackOpsGenieNotification.lambdaFunction,
  })

  new MetricAlarmRuleStack(app, `MetricAlarmRuleStack-${region}`, {
    tags,
    env,
    instanceId,
    stateMachine: stateMachineStack.stateMachine,
  })
}
