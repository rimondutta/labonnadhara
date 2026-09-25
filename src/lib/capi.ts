import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

export interface CapiEventData {
  eventName: string;
  eventTime: number;
  eventId?: string;
  eventSourceUrl?: string;
  actionSource: 'website' | 'app' | 'physical_store' | 'system_generated' | 'chat' | 'other';
  userData: {
    em?: string;  // email (hashed)
    ph?: string;  // phone (hashed)
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
    external_id?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    content_ids?: string[];
    content_type?: string;
    order_id?: string;
    [key: string]: any;
  };
}

/**
 * Hash data using SHA-256 for Meta CAPI
 */
export function hashData(data: string): string {
  if (!data) return '';
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

/**
 * Send an event to the Meta Conversions API
 */
export async function sendCapiEvent(eventData: CapiEventData) {
  const logPrefix = `[CAPI:${eventData.eventName}:${eventData.eventId ?? 'no-id'}]`;
  try {
    await connectToDatabase();
    const settingsDoc = await Settings.findOne({ key: 'global' }).lean();

    if (!settingsDoc?.facebookPixel) {
      console.error(`${logPrefix} FAILED — no facebookPixel settings document found in DB`);
      return { success: false, error: 'No pixel config found' };
    }

    const { pixelId, accessToken, enabled, testEventCode } = settingsDoc.facebookPixel;

    if (!enabled) {
      console.warn(`${logPrefix} SKIPPED — pixel is disabled in admin settings`);
      return { success: false, error: 'Pixel is disabled' };
    }
    if (!pixelId) {
      console.error(`${logPrefix} FAILED — pixelId is empty in admin settings`);
      return { success: false, error: 'Pixel ID not configured' };
    }
    if (!accessToken) {
      console.error(`${logPrefix} FAILED — accessToken is empty in admin settings`);
      return { success: false, error: 'Access token not configured' };
    }

    // ⚠️  CRITICAL DIAGNOSTIC — testEventCode routes events to Meta's Test Events tab ONLY.
    // They will NOT appear in the production Events Manager or Ads Manager event lists.
    // Clear this field in Admin → Settings → Pixel once you are done testing.
    if (testEventCode) {
      console.warn(
        `${logPrefix} ⚠️  testEventCode is SET ("${testEventCode}"). ` +
        `This event will appear in Meta Events Manager → Test Events ONLY. ` +
        `It will NOT show as a production Conversions API event. ` +
        `Remove the Test Event Code in Admin → Settings → Pixel to go live.`
      );
    }

    console.log(
      `${logPrefix} Sending to Meta CAPI — pixelId: ${pixelId}, ` +
      `eventTime: ${eventData.eventTime}, actionSource: ${eventData.actionSource}, ` +
      `hasEmail: ${!!eventData.userData.em}, hasPhone: ${!!eventData.userData.ph}, ` +
      `hasFbp: ${!!eventData.userData.fbp}, hasFbc: ${!!eventData.userData.fbc}, ` +
      `value: ${eventData.customData?.value}, currency: ${eventData.customData?.currency}`
    );

    // Format the payload according to Meta specifications
    const payload: any = {
      data: [
        {
          event_name: eventData.eventName,
          event_time: eventData.eventTime,
          event_id: eventData.eventId,
          action_source: eventData.actionSource,
          event_source_url: eventData.eventSourceUrl,
          user_data: {
            client_ip_address: eventData.userData.client_ip_address,
            client_user_agent: eventData.userData.client_user_agent,
          },
        },
      ],
    };

    if (eventData.userData.em) payload.data[0].user_data.em = [hashData(eventData.userData.em)];
    if (eventData.userData.ph) payload.data[0].user_data.ph = [hashData(eventData.userData.ph)];
    if (eventData.userData.fbc) payload.data[0].user_data.fbc = eventData.userData.fbc;
    if (eventData.userData.fbp) payload.data[0].user_data.fbp = eventData.userData.fbp;
    if (eventData.userData.external_id) payload.data[0].user_data.external_id = [hashData(eventData.userData.external_id)];

    if (eventData.customData) {
      payload.data[0].custom_data = eventData.customData;
    }

    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    // Log full Meta response — never log the access token (it's only in the URL, not the body)
    if (!response.ok) {
      console.error(
        `${logPrefix} Meta API ERROR — HTTP ${response.status}: `,
        JSON.stringify(responseBody)
      );
      return { success: false, error: responseBody.error?.message || 'Failed to send CAPI event' };
    }

    console.log(
      `${logPrefix} Meta API SUCCESS — HTTP ${response.status}, ` +
      `events_received: ${responseBody.events_received ?? 'unknown'}, ` +
      `fbtrace_id: ${responseBody.fbtrace_id ?? 'none'}`
    );
    return { success: true, data: responseBody };
  } catch (error: any) {
    console.error(`${logPrefix} Exception thrown:`, error.message ?? error);
    return { success: false, error: error.message };
  }
}
