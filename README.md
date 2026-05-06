# Twitch Sub Tracker (Cloudflare Worker)

Track Twitch sub activity and append it to a Google Sheet.

This is the updated version of [twitch-sub-tracker](https://github.com/snazzyfox/twitch-sub-tracker/) that uses runs on Cloudflare Workers rather than requiring a always-on server.

This is intended for use by one channel at a time. You need to deploy your own copy for your channel. Cloudflare Workers' free tier has limits that would limit this webhook to ~3000 events per day; you may need to upgrade to a paid plan depending on your needs.

## Usage

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/)
- [Twitch Developer app](https://dev.twitch.tv/dashboard)
- [Google Cloud](https://cloud.google.com) service account with Sheets API enabled

If you want to do anything in the CLI, you will need a relatively recent version of Node.js installed as well.

### Quickstart

The simplest way to use this is by deploying this code as-is to Cloudflare. Click the button below to deploy this to your account.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/snazzyfox/twitch-gsheet-tracker-cf)

Alternatively, you can deploy this with [Wrangler CLI](https://github.com/cloudflare/wrangler):

```bash
npx wrangler deploy --name twitch-gsheet-tracker https://github.com/snazzyfox/twitch-gsheet-tracker-cf
```

### Configuration

After deploying, look for your worker's domain name (ends with .workers.dev) in your Cloudflare dashboard.

You will need to add `https://<your-worker>.workers.dev/subscribe` to your Twitch app's "Redirect URIs" setting.

After that, go to the Workers dashboard you just deployed, then the "Settings" tab. Look for the "Environment Variables" section and add the following:

- `BROADCASTER_ID`: [Twitch user ID](https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/) for the channel to track
- `TWITCH_CLIENT_ID`: From your Twitch Developer app
- `TWITCH_CLIENT_SECRET` (Secret): From your Twitch Developer app
- `GSHEET_SPREADSHEET_ID`: The ID of the Google Sheet to write to. Make sure this sheet is shared with edit access with the email address of the service account you're using.
- `GSHEET_SHEET_NAME`: The name of the Google Sheet to write to.
- `GSHEET_CREDENTIALS` (Secret): Contents of the `credentials.json` file you got when you created the Google service account
- `WEBHOOK_SECRET` (Secret): Any random string you want between 10 and 100 characters long. This lets the app know the message is actually one you asked for from Twitch, not someone random on the Internet.

### Connecting to Twitch

Look for your worker URL (a website ending with `.workers.dev`). Copy the URL, add `/subscribe` to the end, and open it in your browser. Sign in to Twitch, agree to give the application access to your data, and you should see the "OK" on the page. This means twitch is now sending sub events to your worker.

At this point, if everything is working, you should see events pop up in your Google Sheet.

## Event Data written to Google Sheets

This tool will append rows to the Google Sheet you specify with the following columns. You may want to add a header row before the data for easier use:

- Timestamp
- Action (`Sub`, `Resub`, `Gift`, `Cheer`, `Hype Train`)
- Tier (for subs) or Level (for hype train)
- Amount (number of subs or bits)
- User
- Message

### Troubleshooting

The worker is configured with logging enabled. If things aren't working, check the logs in the Observability tab of your Workers dashboard.

## Development

#### Install dependencies

```bash
npm install
```

#### Set up local deveopment environment
Copy `.env.template` to `.env` and fill it out (see above).

#### Run locally
```bash
npm run dev
```

You can test webhooks by sending mock events with [Twitch CLI](https://github.com/twitchdev/twitch-cli).

## Deploy

```bash
npm run deploy
```
