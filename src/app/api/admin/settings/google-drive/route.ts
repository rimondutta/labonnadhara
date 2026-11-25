import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { testGoogleDriveConnection } from '@/lib/google-drive';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const envStatus = {
      clientIdConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
      clientSecretConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      redirectUriConfigured: Boolean(process.env.GOOGLE_REDIRECT_URI),
      refreshTokenConfigured: Boolean(process.env.GOOGLE_REFRESH_TOKEN),
      rootFolderIdConfigured: Boolean(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID),
    };

    const isMissingConfig =
      !envStatus.clientIdConfigured ||
      !envStatus.clientSecretConfigured ||
      !envStatus.refreshTokenConfigured;

    if (isMissingConfig) {
      return NextResponse.json({
        connected: false,
        error: 'Missing required Google OAuth credentials in environment variables.',
        envStatus,
      });
    }

    const result = await testGoogleDriveConnection();
    return NextResponse.json({
      ...result,
      envStatus,
    });
  } catch (error: unknown) {
    console.error('[Google Drive Settings API] Error:', error);
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : 'Failed to test Google Drive connection',
      },
      { status: 500 }
    );
  }
}
