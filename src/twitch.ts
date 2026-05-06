import { ApiClient, HelixEventSubTransportOptions } from '@twurple/api';
import { AppTokenAuthProvider, exchangeCode, RefreshingAuthProvider } from '@twurple/auth';
import { env } from 'cloudflare:workers';
import { HonoRequest } from 'hono';
import crypto from 'crypto';
import { DataRow } from './types';

const scope = 'user:bot channel:bot user:read:chat bits:read channel:read:hype_train';
const authProvider = new AppTokenAuthProvider(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET);
const apiClient = new ApiClient({ authProvider });

export function signInUrl(uri: string): string {
  return (
    'https://id.twitch.tv/oauth2/authorize?' +
    new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      redirect_uri: uri,
      response_type: 'code',
      scope,
    })
  );
}

export async function authenticate(code: string, redirectUri: string) {
  await exchangeCode(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET, code, redirectUri);
  // This only serves to authenticate the user so that the app has access to their data
}

export async function resyncSubscriptions(callback: string) {
  // First get all existing subscriptions and remove them in order to avoid duplicates
  const existingSubs = await apiClient.eventSub.getSubscriptions();
  for (const sub of existingSubs.data) {
    await apiClient.eventSub.deleteSubscription(sub.id);
  }

  const webhookTransport = {
    method: 'webhook',
    secret: env.WEBHOOK_SECRET,
    callback,
  } satisfies HelixEventSubTransportOptions;

  // Then add all subscriptions we want
  console.trace("Subscribing to Chat Notifications");
  await apiClient.eventSub.subscribeToChannelChatNotificationEvents(env.BROADCASTER_ID, webhookTransport);
  console.trace("Subscribing to Bits Use");
  await apiClient.eventSub.subscribeToChannelBitsUseEvents(env.BROADCASTER_ID, webhookTransport);
  console.trace("Subscribing to Hype Train End");
  await apiClient.eventSub.subscribeToChannelHypeTrainEndV2Events(env.BROADCASTER_ID, webhookTransport);
}

export async function verifySignature(req: HonoRequest) {
  const messageId = req.header('Twitch-Eventsub-Message-Id') ?? '';
  const messageTimestamp = req.header('Twitch-Eventsub-Message-Timestamp');
  const messageSignature = req.header('Twitch-Eventsub-Message-Signature');
  const rawBody = await req.text();
  const message = messageId + messageTimestamp + rawBody.trim();

  let expectedSignatureHeader = 'sha256=' + crypto.createHmac('sha256', Buffer.from(env.WEBHOOK_SECRET, 'utf8')).update(message).digest('hex');
  return expectedSignatureHeader === messageSignature;
}

export function getDataRowFromMessage(message: any): DataRow | undefined {
  console.trace('Received message', message);
  switch (message.subscription.type) {
    case 'channel.chat.notification':
      switch (message.event.notice_type) {
        case 'sub':
          return { action: 'Sub', level: message.event.sub.sub_tier, amount: 1, user: message.event.chatter_user_name };
        case 'resub':
          if (!message.event.resub.is_gift)
            return { action: 'Resub', level: message.event.resub.sub_tier, amount: 1, user: message.event.chatter_user_name };
        case 'sub_gift':
          if (!message.event.sub_gift.community_gift_id)
            return { action: 'Gift', level: message.event.sub_gift.sub_tier, amount: 1, user: message.event.chatter_user_name };
        case 'community_sub_gift':
          return {
            action: 'Gift',
            level: message.event.community_sub_gift.sub_tier,
            amount: message.event.community_sub_gift.total,
            user: message.event.chatter_user_name,
          };
      }
    case 'channel.bits.use':
      return {
        action: 'Cheer',
        user: message.event.user_name,
        amount: message.event.bits,
      };
    case 'channel.hype_train.end':
      return {
        action: 'Hype Train',
        level: message.event.level,
      };
  }
}
