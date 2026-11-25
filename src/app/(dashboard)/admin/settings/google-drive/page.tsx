"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  HardDrive,
  Key,
  Folder,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface StatusData {
  connected: boolean;
  email?: string;
  rootFolderId?: string;
  error?: string;
  envStatus?: {
    clientIdConfigured: boolean;
    clientSecretConfigured: boolean;
    redirectUriConfigured: boolean;
    refreshTokenConfigured: boolean;
    rootFolderIdConfigured: boolean;
  };
}

export default function GoogleDriveSettingsPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const checkConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/settings/google-drive");
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setData({
        connected: false,
        error: err instanceof Error ? err.message : "Network error testing connection",
      });
    } finally {
      setLoading(false);
      setTesting(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HardDrive className="text-blue-600" size={26} />
              Google Drive Integration
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Automated customer photo upload storage for custom photo frame orders
            </p>
          </div>
        </div>
        <button
          onClick={checkConnection}
          disabled={testing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={testing ? "animate-spin" : ""} />
          {testing ? "Testing Connection..." : "Test Connection"}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Checking Google Drive connection status...</p>
        </div>
      ) : (
        <>
          {/* Connection Status Card */}
          <div
            className={`rounded-xl border p-6 ${
              data?.connected
                ? "bg-green-50/50 border-green-200"
                : "bg-amber-50/50 border-amber-200"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-full ${
                  data?.connected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {data?.connected ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  {data?.connected ? "Google Drive Connected" : "Connection Pending or Required"}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {data?.connected
                    ? "Customer photos will be automatically uploaded to the owner's Google Drive under Photo Frame Orders/ upon successful checkout."
                    : data?.error ||
                      "Google Drive API credentials are not yet fully configured in your environment."}
                </p>

                {data?.connected && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {data.email && (
                      <div className="bg-white p-3 rounded-lg border border-green-100 flex items-center gap-2">
                        <ShieldCheck size={16} className="text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Connected Account</p>
                          <p className="font-medium text-gray-800">{data.email}</p>
                        </div>
                      </div>
                    )}
                    {data.rootFolderId && (
                      <div className="bg-white p-3 rounded-lg border border-green-100 flex items-center gap-2">
                        <Folder size={16} className="text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500">Root Folder ID</p>
                          <code className="text-xs font-mono text-gray-800 break-all">
                            {data.rootFolderId}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Environment Variables Checklist */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Key size={18} className="text-gray-500" />
              Environment Variables Configuration
            </h3>
            <p className="text-sm text-gray-500">
              Google Drive integration authenticates securely on the server via OAuth2 refresh token.
            </p>

            <div className="divide-y divide-gray-100">
              <div className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-mono text-gray-700">GOOGLE_CLIENT_ID</span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {data?.envStatus?.clientIdConfigured ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle size={14} /> Missing
                    </span>
                  )}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-mono text-gray-700">GOOGLE_CLIENT_SECRET</span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {data?.envStatus?.clientSecretConfigured ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle size={14} /> Missing
                    </span>
                  )}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-mono text-gray-700">GOOGLE_REFRESH_TOKEN</span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {data?.envStatus?.refreshTokenConfigured ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle size={14} /> Missing
                    </span>
                  )}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-mono text-gray-700">GOOGLE_REDIRECT_URI</span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {data?.envStatus?.redirectUriConfigured ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <span className="text-gray-400">Optional (Defaults to OAuth Playground)</span>
                  )}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-sm">
                <span className="font-mono text-gray-700">GOOGLE_DRIVE_ROOT_FOLDER_ID</span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {data?.envStatus?.rootFolderIdConfigured ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <span className="text-gray-400">Optional (Auto-creates root folder)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Setup Guide Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Folder size={18} className="text-gray-500" />
              How to Setup Google Drive OAuth (5 Minutes)
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600">
              <li>
                Visit{" "}
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Google Cloud Console <ExternalLink size={12} />
                </a>{" "}
                and create a project (e.g., &ldquo;Labonnadhara Store&rdquo;).
              </li>
              <li>
                Enable the <strong>Google Drive API</strong> in <strong>APIs & Services &gt; Library</strong>.
              </li>
              <li>
                In <strong>APIs & Services &gt; Credentials</strong>, create an <strong>OAuth 2.0 Client ID</strong> (Web application). Add{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                  https://developers.google.com/oauthplayground
                </code>{" "}
                as an Authorized Redirect URI.
              </li>
              <li>
                Go to{" "}
                <a
                  href="https://developers.google.com/oauthplayground"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Google OAuth Playground <ExternalLink size={12} />
                </a>
                , click the gear icon (top right), check <em>&ldquo;Use your own OAuth credentials&rdquo;</em>, and enter your Client ID and Client Secret.
              </li>
              <li>
                Under <strong>Step 1</strong>, input scope{" "}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                  https://www.googleapis.com/auth/drive.file
                </code>{" "}
                and authorize with your business Google account.
              </li>
              <li>
                Under <strong>Step 2</strong>, click <em>&ldquo;Exchange authorization code for tokens&rdquo;</em> and copy the generated <strong>Refresh token</strong>.
              </li>
              <li>
                Add the variables to your <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.env</code> or hosting environment variables:
                <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono mt-2 overflow-x-auto">
{`GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_DRIVE_ROOT_FOLDER_ID=  # Optional: specify existing folder ID`}
                </pre>
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
