import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import * as lambda from '@aws-cdk/aws-lambda'
import { capitalizeAndRemoveDashes } from './helpers'

interface LambdaStackProps extends cdk.StackProps {
  name: string,
  runtime?: lambda.Runtime,
  handler?: string,
  timeout?: cdk.Duration,
  pathToFunction?: string,
  policyStatementProps?: iam.PolicyStatementProps,
  environment?: {
    [key: string]: string
  },
}

export class LambdaStack extends cdk.Stack {
  readonly lambdaFunction: lambda.Function

  constructor(scope: cdk.Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props)

    const resourceName = capitalizeAndRemoveDashes(props.name)

    const role = new iam.Role(this, `Role${resourceName}`, { assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com') })
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'))
    if (props.policyStatementProps) {
      role.addToPolicy(new iam.PolicyStatement(props.policyStatementProps))
    }

    const lambdaFunction = new lambda.Function(this, `LambdaFunction${resourceName}`, {
      role,
      runtime: props.runtime || lambda.Runtime.NODEJS_12_X,
      handler: props.handler || 'app.handler',
      timeout: props.timeout || cdk.Duration.seconds(10),
      code: lambda.Code.fromAsset(`${props.pathToFunction || 'src'}/${props.name}`),
      environment: props.environment,
    })

    this.lambdaFunction = lambdaFunction
  }
}
