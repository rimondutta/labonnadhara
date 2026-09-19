import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

export interface CapiEventData {
  eventName: string;
  eventTime: number;
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
  try {
    await connectToDatabase();
    const settingsDoc = await Settings.findOne({ key: 'global' }).lean();
    if (!settingsDoc?.facebookPixel) {
      return { success: false, error: 'No pixel config found' };
    }

    const { pixelId, accessToken, enabled, testEventCode } = settingsDoc.facebookPixel;

    if (!enabled || !pixelId || !accessToken) {
      return { success: false, error: 'CAPI not configured or disabled' };
    }

    // Format the payload according to Meta specifications
    const payload: any = {
      data: [
        {
          event_name: eventData.eventName,
          event_time: eventData.eventTime,
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

    const response = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta CAPI Error:', data);
      return { success: false, error: data.error?.message || 'Failed to send CAPI event' };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending CAPI event:', error);
    return { success: false, error: error.message };
  }
}
