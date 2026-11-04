import { NextResponse } from "next/server";

/**
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * The browser sends a JSON body with a "csp-report" key when a CSP directive
 * is violated. This endpoint logs the essential fields server-side for
 * monitoring and returns 204 No Content.
 *
 * No authentication required — browsers call this automatically.
 * Rate limiting is handled at the CDN / Next.js middleware level.
 */

interface CspViolationReport {
  "document-uri"?: string;
  "violated-directive"?: string;
  "effective-directive"?: string;
  "blocked-uri"?: string;
  "source-file"?: string;
  "line-number"?: number;
  "column-number"?: number;
  "original-policy"?: string;
  "status-code"?: number;
}

interface CspReportBody {
  "csp-report"?: CspViolationReport;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (
      !contentType.includes("application/csp-report") &&
      !contentType.includes("application/json")
    ) {
      return new NextResponse(null, { status: 415 });
    }

    const body: CspReportBody = await req.json().catch(() => ({}));
    const report = body["csp-report"];

    if (report) {
      // Log only the fields useful for security monitoring — never log
      // personal data or the full original policy (which can be very long).
      console.warn("[CSP Violation]", {
        documentUri: report["document-uri"],
        violatedDirective: report["violated-directive"],
        effectiveDirective: report["effective-directive"],
        blockedUri: report["blocked-uri"],
        sourceFile: report["source-file"],
        lineNumber: report["line-number"],
        columnNumber: report["column-number"],
        statusCode: report["status-code"],
      });
    }
  } catch {
    // Silently ignore parse errors — malformed reports are not actionable
  }

  // Always return 204 so browsers do not retry
  return new NextResponse(null, { status: 204 });
}

