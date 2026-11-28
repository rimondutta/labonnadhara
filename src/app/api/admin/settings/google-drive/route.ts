import { NextResponse } from 'next/server';
import { testGoogleDriveConnection } from '@/lib/google-drive';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const envStatus = {
      clientIdConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
      clientSecretConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      redirectUriConfigured: Boolean(process.env.GOOGLE_REDIRECT_URI),
      refreshTokenConfigured: Boolean(process.env.GOOGLE_REFRESH_TOKEN),
      rootFolderIdConfigured: Boolean(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID),
    };

    if (
      !envStatus.clientIdConfigured ||
      !envStatus.clientSecretConfigured ||
      !envStatus.refreshTokenConfigured
    ) {
      return NextResponse.json(
        {
          connected: false,
          envStatus,
          error: 'Required Google Drive environment variables are missing.',
        },
        { headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const result = await testGoogleDriveConnection();
    return NextResponse.json(
      {
        ...result,
        envStatus,
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[Admin Settings Google Drive]:', getSafeErrorMessage(error));
    return NextResponse.json(
      {
        connected: false,
        error: getSafeErrorMessage(error),
      },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
