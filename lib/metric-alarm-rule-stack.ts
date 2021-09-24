import * as cdk from '@aws-cdk/core'
import * as cloudwatch from '@aws-cdk/aws-cloudwatch'
import * as events from '@aws-cdk/aws-events'
import * as targets from '@aws-cdk/aws-events-targets'
import * as sfn from '@aws-cdk/aws-stepfunctions'

interface MetricAlarmRuleStackProps extends cdk.StackProps {
  instanceId: string,
  stateMachine: sfn.IStateMachine,
  input?: events.RuleTargetInput,
  namespace?: string,
  metricName?: string,
  period?: number,
  statistic?: string,
  alarmName?: string,
  threshold?: number,
  evaluationPeriods?: number,
  comparisonOperator?: cloudwatch.ComparisonOperator,
}

export class MetricAlarmRuleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: MetricAlarmRuleStackProps) {
    super(scope, id, props)

    const input = props.input || events.RuleTargetInput.fromEventPath('$.detail.configuration.metrics[0].metricStat.metric.dimensions')
    const namespace = props.namespace || 'AWS/EC2'
    const metricName = props.metricName || 'CPUUtilization'
    const period = cdk.Duration.seconds(props.period || 300)
    const statistic = props.statistic || cloudwatch.Statistic.MAXIMUM
    const alarmName = props.alarmName || 'cpu-check'
    const threshold = props.threshold || 100
    const evaluationPeriods = props.evaluationPeriods || 1
    const comparisonOperator = props.comparisonOperator || cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD

    const metric = new cloudwatch.Metric({
      namespace,
      metricName,
      period,
      statistic,
      dimensions: {
        InstanceId: props.instanceId,
      },
    })

    const alarm = new cloudwatch.Alarm(this, 'CPUUtilizationAlarm', {
      metric,
      alarmName,
      threshold,
      evaluationPeriods,
      comparisonOperator,
      alarmDescription: `If the ${metric.statistic} ${metric.metricName} over the last ${evaluationPeriods} period(s) of ${metric.period.toSeconds()}s is ${comparisonOperator} of ${threshold}%, trigger the alarm`,
    })

    const rule = new events.Rule(this, 'CPUUtilizationAlarmStateRule', {
      description: `Catch ALARM state of ${alarm.alarmName} and pass the event to Step Functions for further processing`,
      eventPattern: {
        source: ['aws.cloudwatch'],
        detailType: ['CloudWatch Alarm State Change'],
        resources: [alarm.alarmArn],
        detail: {
          state: {
            value: ['ALARM'],
          },
        },
      },
    })

    rule.addTarget(new targets.SfnStateMachine(props.stateMachine, { input }))
  }
}
