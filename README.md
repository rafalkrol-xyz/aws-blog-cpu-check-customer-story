# AWS Blog CPU Check Customer Story

## Overview

The CPU Check is a simple serverless application that serves as a first-line of support in case a given EC2 instance maxes out on CPU.

## Prerequisites

* [an AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/) in which you can interact with the following services:
  * [IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)
  * [CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html)
  * [Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
  * [Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)
  * [CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html)
  * [S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
* [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) that's properly [configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
* [Docker](https://www.docker.com/)
* [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* [AWS SAM CLI – beta](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-cdk.html)
* [Node v16 or higher](https://nodejs.org/en/)
  * the recommended way is to install it with [NVM](https://github.com/nvm-sh/nvm), e.g.:

  ```bash
  nvm install v16.1.0
  nvm use v16.1.0
  ```

* [CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html)

```bash
npm install -g aws-cdk
```

* [TypeScript](https://www.typescriptlang.org/)

```bash
npm install -g typescript
```

* [a Slack Workspace](https://slack.com/intl/en-pl/help/articles/206845317-Create-a-Slack-workspace)
* [an OpsGenie account](https://www.atlassian.com/software/opsgenie)
* [an existing Route 53 health check](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html)

## Flow

The current business logic works as follows:

1. When a CPU maxes out (reaches 100%) on a given instance, a CloudWatch alarm rings.
2. The ringing alarm triggers a Step Functions State Machine.
3. Three checks are being run, one after another.
4. If all checks succeed during the first run, the execution ends silently.
5. If any of the checks fails, the EC2 instance is restarted and we recommence from the start with a second run.
6. If all checks succeed during the second run, a Slack notification is sent.
7. If any of the checks fails during the second run, an OpsGenie alert is created and the execution ends.

![A graph showing the Step Functions State Machine for CPU Check](./images/stepfunctions_graph.svg)

## Installation & deployment

**a)** create [a `.env` file](https://github.com/motdotla/dotenv) and populate it with appropriate values as per `.env.example`

```bash
cat >> .env << EOF
SLACK_TOKEN=YOUR_SLACK_TOKEN
SLACK_CHANNEL_ID=YOUR_SLACK_CHANNEL_ID
TEAM_ID=YOUR_TEAM_ID
API_KEY=YOUR_API_KEY
R53_HEALTH_CHECK_ID=YOUR_R53_HEALTH_CHECK_ID
EOF
```

**b)** install Node modules that CDK will utilize

```bash
npm install
```

**c)** [bootstrap your CDK environments](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html)

```bash
cdk bootstrap
```

**d)** build Lambda packages

```bash
sam-beta-cdk build
```

**e)** deploy the application to all regions

```bash
cdk deploy --app .aws-sam/build --all --require-approval never
```

**f)** (OPTIONAL) run a subsequent `cdk deploy` to update the paths in metadata

```bash
cdk deploy --all --require-approval never
```

## Cleanup

**a)** destroy the CDK resources

```bash
cdk destroy --all
```

**b)** empty all of the staging buckets containing the Lambda packages

```bash
aws s3 rm s3://YOUR_STAGING_BUCKET --recursive
```

* `YOUR_STAGING_BUCKET` - the name of the staging bucket that was created by the `cdk bootstrap` command. It'll be named `cdktoolkit-stagingbucket` followed by some random characters.
**NB** there is one bucket per each region your CDK app uses

**c)** delete the CDKToolkit stack in each of the regions it was created in

```bash
aws cloudformation delete-stack --stack-name CDKToolkit --region REGION
```

* `REGION` - [the code of an AWS region](https://docs.aws.amazon.com/general/latest/gr/rande.html#regional-endpoints) in which you bootstrapped your CDK app.
**NB** there is a CDKToolkit stack in each of the regions in which you bootstrapped your CDK app

## Lambda

### Environment variables

All current [env vars used by the Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html) constituting this application are listed below:

**a)** Url Health Check function

* `URL` - (OPTIONAL) - the URL to be checked by the function. If not set, the IP of the EC2 instance in question is used
* `HTTPS` - (OPTIONAL) - if `URL` is not set, determines whether HTTPS should be used for the check. Defaults to using HTTP
* `PRIVATE` - (OPTIONAL) - if `URL` is not set, determines whether the private IP address should be used for the check. Defaults to using the public IP
* `HEALTH_CHECK_URI` - (OPTIONAL) - if `URL` is not set, defines a path to be appended to the IP address. Defaults to NOT appending any path
* `METHOD` - (OPTIONAL) - the method to be used for the check. Defaults to GET
* `TIMEOUT` - (OPTIONAL) - the timeout for the check request. Defaults to 3000 milliseconds

**b)** Route53 Check function

* `R53_HEALTH_CHECK_ID` - the ID of [the Route 53 Health Check](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-types.html) to be verified

**c)** SSH Check function

* `SSH_HOST` - (OPTIONAL) - the host for which the ssh connection should be checked
* `PRIVATE` - (OPTIONAL) - if `SSH_HOST` is not set, determines whether the private IP address should be used for the check. Defaults to using the public IP
* `SSH_PORT` - (OPTIONAL) - the port to use for the ssh connection. Defaults to 22
* `SSH_HANDSHAKE_TIMEOUT` - (OPTIONAL) - the timeout of the ssh handshake, which must be smaller than the function's timeout. Defaults to 5000 milliseconds

**d)** Restart Server function

* no env vars used

**e)** Slack Notification function

* `SLACK_TOKEN` - (**REQUIRED**) - the token of a [Slack App](https://api.slack.com/authentication/basics) that will post the notifications to a given Slack workspace
* `SLACK_CHANNEL_ID` - (**REQUIRED**) - the ID of the Slack channel to which the notification will be posted

**f)** OpsGenie Notification function

* `TEAM_ID` - (**REQUIRED**) - the ID of an OpsGenie team
* `PRIORITY` - (OPTIONAL) - the priority of the alert. [Defaults to P3](https://docs.opsgenie.com/docs/alert-api#create-alert)
* `EU` - (OPTIONAL) - flag for using the European Union's endpoint. Defaults to using the American one
* `API_KEY` - (**REQUIRED**) - the OpsGenie's API key for your team

### Testing

All of the Lambda functions can be invoked locally, inside a docker container, using [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-cdk-testing.html).
**NB** please be aware that the actual logic is executed in a given AWS account.

**a)** [compile TypeScript](https://docs.aws.amazon.com/cdk/latest/guide/hello_world.html#hello_world_tutorial_build)

```bash
npm run build # or `npm run watch` in a separate terminal window/tab to for constant TypeScript compilation in the background
```

**b)** build Lambda packages

```bash
sam-beta-cdk build
```

**c)** invoke a given lambda

```bash
sam-beta-cdk local invoke [OPTIONS] STACK_NAME/FUNCTION_IDENTIFIER
```

* `OPTIONS` - [non-mandatory options that the command supports](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-invoke.html), e.g. `--event events/startOfFirstRun.json --env-vars locals.json`
* `STACK_NAME/FUNCTION_IDENTIFIER` - the name of the CDK stack to which a given Lambda belongs, followed by the Lambda function resource name, e.g. `LambdaStackUrlHealthCheck-eu-west-1/LambdaFunctionUrlHealthCheck`
