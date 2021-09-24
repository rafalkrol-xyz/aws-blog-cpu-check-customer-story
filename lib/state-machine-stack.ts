import * as cdk from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as sfn from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'

interface StateMachineStackProps extends cdk.StackProps {
  urlHealthCheck: lambda.IFunction,
  r53Check: lambda.IFunction,
  sshCheck: lambda.IFunction,
  restartServer: lambda.IFunction,
  slackNotification: lambda.IFunction,
  opsGenieNotification: lambda.IFunction,
  outputPath?: string,
  time?: number,
}

export class StateMachineStack extends cdk.Stack {
  
  readonly stateMachine: sfn.StateMachine
  
  constructor(scope: cdk.Construct, id: string, props: StateMachineStackProps) {
    super(scope, id, props)

    const outputPath = props.outputPath || '$.Payload'
    const time = sfn.WaitTime.duration(cdk.Duration.seconds(props.time || 120))

    const urlHealthCheckStep = new tasks.LambdaInvoke(this, 'URL Health Check', {
      lambdaFunction: props.urlHealthCheck,
      outputPath,
    })
    const urlHealthCheckChoice = new sfn.Choice(this, 'Did URL Health Check pass?')

    const r53CheckStep = new tasks.LambdaInvoke(this, 'Route53 Check', {
      lambdaFunction: props.r53Check,
      outputPath,
    })
    const r53CheckChoice = new sfn.Choice(this, 'Did Route53 Check pass?')

    const sshCheckStep = new tasks.LambdaInvoke(this, 'SSH Check', {
      lambdaFunction: props.sshCheck,
      outputPath,
    })
    const sshCheckChoice = new sfn.Choice(this, 'Did SSH Check pass?')

    const wait = new sfn.Wait(this, 'Wait for the server to boot', {
      time,
    }).next(urlHealthCheckStep)

    const restartServerStep = new tasks.LambdaInvoke(this, 'Restart the server', {
      lambdaFunction: props.restartServer,
      outputPath,
    }).next(wait)

    const slackNotificationStep = new tasks.LambdaInvoke(this, 'Slack', {
      lambdaFunction: props.slackNotification,
      outputPath,
    })

    const opsGenieNotificationStep = new tasks.LambdaInvoke(this, 'OpsGenie', {
      lambdaFunction: props.opsGenieNotification,
      outputPath,
    })

    const success = new sfn.Succeed(this, 'All good')

    const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      definition: urlHealthCheckStep
        .next(urlHealthCheckChoice
          .when(sfn.Condition.and(sfn.Condition.booleanEquals('$.checkPassed', false), sfn.Condition.isNotPresent('$.secondRun')), restartServerStep)
          .when(sfn.Condition.and(sfn.Condition.booleanEquals('$.checkPassed', false), sfn.Condition.isPresent('$.secondRun'), sfn.Condition.booleanEquals('$.secondRun', true)), opsGenieNotificationStep)
          .when(sfn.Condition.booleanEquals('$.checkPassed', true),
            r53CheckStep
              .next(r53CheckChoice
                .when(sfn.Condition.and(sfn.Condition.booleanEquals('$.checkPassed', false), sfn.Condition.isPresent('$.secondRun'), sfn.Condition.booleanEquals('$.secondRun', true)), opsGenieNotificationStep)
                .when(sfn.Condition.and(sfn.Condition.booleanEquals('$.checkPassed', false), sfn.Condition.isNotPresent('$.secondRun')), restartServerStep)
                .when(sfn.Condition.booleanEquals('$.checkPassed', true),
                  sshCheckStep
                    .next(sshCheckChoice
                      .when(sfn.Condition.and(sfn.Condition.booleanEquals('$.checkPassed', false), sfn.Condition.isNotPresent('$.secondRun')), restartServerStep)
                      .when(sfn.Condition.and(sfn.Condition.booleanEquals('$.checkPassed', false), sfn.Condition.isPresent('$.secondRun'), sfn.Condition.booleanEquals('$.secondRun', true)), opsGenieNotificationStep)
                      .when(sfn.Condition.and(sfn.Condition.booleanEquals('$.checkPassed', true), sfn.Condition.isPresent('$.secondRun'), sfn.Condition.booleanEquals('$.secondRun', true)), slackNotificationStep)
                      .when(sfn.Condition.booleanEquals('$.checkPassed', true), success)
                    )
                )
              )
          )
        ),
    })

    this.stateMachine = stateMachine
  }
}
