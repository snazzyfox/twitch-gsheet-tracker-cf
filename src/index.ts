import { Hono } from 'hono';
import { authenticate, getDataRowFromMessage, resyncSubscriptions, signInUrl, verifySignature } from './twitch';
import { DataRow } from './types';
import { writeRows } from './gsheet';

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /subscribe
 * The main entrypoint to enable subscriptions. This is also the OAuth callback URL:
 *   If user is not logged in, redirect to twitch login.
 *   If user is logged in, their auth code is used to mint a token, which is then used to create subscriptions.
 */
app.get('/subscribe', async ({ req, redirect, text }) => {
	const code = req.query('code');
	const redirectUri = req.url.replace(/(\?|#).*$/, '');
	if (!code) return redirect(signInUrl(redirectUri));

	await authenticate(code, redirectUri);

	// Get the url for the /webhook endpoint
	const webhookUrl = new URL(req.url).origin + '/webhook';
	await resyncSubscriptions(webhookUrl);
	return text('OK');
});

/** GET /webhook
 * The webhook endpoint. This receives twitch webhook messages and queues them for processing.
 */
app.post('/webhook', async ({ req, env, text }) => {
	if (!(await verifySignature(req))) return text('Bad signature', { status: 403 });
	switch (req.header('Twitch-Eventsub-Message-Type')) {
		case 'webhook_callback_verification':
			return text((await req.json()).challenge);
		case 'notification':
			const dataRow = getDataRowFromMessage(await req.json());
			if (dataRow) await env.QUEUE.send(dataRow);
			return text('OK');
	}
	return text('Unrecognized message type', { status: 400 });
});

const queue: ExportedHandlerQueueHandler<Env, DataRow> = async function (batch) {
	await writeRows(batch.messages);
};

export default {
	fetch: app.fetch,
	queue,
} satisfies ExportedHandler<Env, DataRow>;
