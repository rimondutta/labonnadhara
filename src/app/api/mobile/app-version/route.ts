import { NextResponse } from 'next/server';

/**
 * GET /api/mobile/app-version
 *
 * Returns the current mobile app version configuration.
 * All values are driven by environment variables — no rebuild needed.
 *
 * Environment variables (set in Vercel dashboard or .env):
 *   LATEST_APP_VERSION       — the newest released version  (e.g. "1.0.1")
 *   MINIMUM_APP_VERSION      — oldest version still allowed  (e.g. "1.0.0")
 *   FORCE_APP_UPDATE         — "true" to force ALL users to update
 *   ANDROID_UPDATE_URL       — APK / Play Store URL
 *   APP_UPDATE_MESSAGE       — optional custom message shown in the modal
 */

export interface AppVersionConfig {
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  updateMessage: string;
  androidUrl: string;
}

// Revalidate every 5 minutes — fresh enough, low origin load
export const revalidate = 300;

export async function GET() {
  try {
    const latestVersion  = process.env.LATEST_APP_VERSION   ?? '1.0.0';
    const minimumVersion = process.env.MINIMUM_APP_VERSION  ?? '1.0.0';
    const forceUpdate    = process.env.FORCE_APP_UPDATE     === 'true';
    const androidUrl     = process.env.ANDROID_UPDATE_URL   ?? 'https://toyhourse.vercel.app';
    const updateMessage  =
      process.env.APP_UPDATE_MESSAGE ??
      'A new version of Toy Hourse is available. Update now for the latest features and bug fixes.';

    // Basic sanity: versions must look like semver (x.y.z)
    const semverPattern = /^\d+\.\d+\.\d+$/;
    if (!semverPattern.test(latestVersion) || !semverPattern.test(minimumVersion)) {
      return NextResponse.json(
        { error: 'Invalid version configuration on server.' },
        { status: 500 }
      );
    }

    // Only allow HTTPS urls (security)
    if (!androidUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Update URL must use HTTPS.' },
        { status: 500 }
      );
    }

    const config: AppVersionConfig = {
      latestVersion,
      minimumVersion,
      forceUpdate,
      updateMessage,
      androidUrl,
    };

    return NextResponse.json(config, {
      headers: {
        // Allow mobile clients to cache this for 5 minutes
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[app-version] Failed to read version config:', error);
    // Never block users — return a safe fallback
    return NextResponse.json(
      {
        latestVersion: '1.0.0',
        minimumVersion: '1.0.0',
        forceUpdate: false,
        updateMessage: '',
        androidUrl: 'https://toyhourse.vercel.app',
      },
      { status: 200 }
    );
  }
}
