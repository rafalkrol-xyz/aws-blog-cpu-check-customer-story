import { App } from '@aws-cdk/core'
import '@aws-cdk/assert/jest'
import * as iam from '@aws-cdk/aws-iam'
import * as lambda from '@aws-cdk/aws-lambda'
import { LambdaStack } from '../lib/lambda-stack'

describe('A LambdaStack for the url-health-check function', () => {
  const app = new App()
  const testLambdaStack = new LambdaStack(app, 'TestLambdaStack', {
    name: 'url-health-check',
    policyStatementProps: {
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ['ec2:DescribeInstances'],
    },
  })

  test('has one Lambda function', () => {
    expect(testLambdaStack).toCountResources('AWS::Lambda::Function', 1)
  })

  test('has 1 IAM Role that can be assumed by the Lambda service', () => {
    expect(testLambdaStack).toCountResources('AWS::IAM::Role', 1)
    expect(testLambdaStack).toHaveResource('AWS::IAM::Role', {
      'AssumeRolePolicyDocument': {
        'Statement': [
          {
            'Action': 'sts:AssumeRole',
            'Effect': 'Allow',
            'Principal': {
              'Service': 'lambda.amazonaws.com',
            },
          },
        ],
        'Version': '2012-10-17',
      },
    })
  })

  test('has 1 IAM Policy allowing ec2:DescribeInstances on any resource', () => {
    expect(testLambdaStack).toCountResources('AWS::IAM::Policy', 1)
    expect(testLambdaStack).toHaveResource('AWS::IAM::Policy', {
      'PolicyDocument': {
        'Statement': [
          {
            'Action': 'ec2:DescribeInstances',
            'Effect': 'Allow',
            'Resource': '*',
          },
        ],
        'Version': '2012-10-17',
      },
    })
  })

  test('has a property called lambdaFunction of type lambda.Function', () => {
    expect(testLambdaStack).toHaveProperty('lambdaFunction')
    expect(testLambdaStack.lambdaFunction).toBeInstanceOf(lambda.Function)
  })
})

describe('A LambdaStack for the r53-check function', () => {
  const app = new App()
  const R53_HEALTH_CHECK_ID = 'R53_HEALTH_CHECK_ID'
  const testLambdaStack = new LambdaStack(app, 'TestLambdaStack', {
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

  test('has one Lambda function', () => {
    expect(testLambdaStack).toCountResources('AWS::Lambda::Function', 1)
  })

  test('has 1 IAM Role that can be assumed by the Lambda service', () => {
    expect(testLambdaStack).toCountResources('AWS::IAM::Role', 1)
    expect(testLambdaStack).toHaveResource('AWS::IAM::Role', {
      'AssumeRolePolicyDocument': {
        'Statement': [
          {
            'Action': 'sts:AssumeRole',
            'Effect': 'Allow',
            'Principal': {
              'Service': 'lambda.amazonaws.com',
            },
          },
        ],
        'Version': '2012-10-17',
      },
    })
  })

  test('has 1 IAM Policy allowing route53:GetHealthCheckStatus on a predefined resource', () => {
    expect(testLambdaStack).toCountResources('AWS::IAM::Policy', 1)
    expect(testLambdaStack).toHaveResource('AWS::IAM::Policy', {
      'PolicyDocument': {
        'Statement': [
          {
            'Action': 'route53:GetHealthCheckStatus',
            'Effect': 'Allow',
            'Resource': `arn:aws:route53:::healthcheck/${R53_HEALTH_CHECK_ID}`,
          },
        ],
        'Version': '2012-10-17',
      },
    })
  })

  test('has a property called lambdaFunction of type lambda.Function', () => {
    expect(testLambdaStack).toHaveProperty('lambdaFunction')
    expect(testLambdaStack.lambdaFunction).toBeInstanceOf(lambda.Function)
  })
})
