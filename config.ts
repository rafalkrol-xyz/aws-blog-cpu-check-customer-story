import * as dotenv from 'dotenv'
dotenv.config()

export const SLACK_TOKEN = process.env.SLACK_TOKEN
export const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID
export const TEAM_ID = process.env.TEAM_ID
export const API_KEY = process.env.API_KEY
export const R53_HEALTH_CHECK_ID = process.env.R53_HEALTH_CHECK_ID
