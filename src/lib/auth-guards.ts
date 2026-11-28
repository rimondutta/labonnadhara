import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import { authOptions } from './auth';
import {
  ALLOWED_ROLES,
  AppRole,
  extractBearerToken,
  verifyBearerJwt,
} from './bearer-token';
import connectToDatabase from './db';
import User from '@/models/User';

export type { AppRole };

/**
 * Role Permission Matrix (Labonnadhara RBAC)
 *
 * - customer:
 *   - Allowed: own profile/addresses (`/api/users/*`), own orders (`/api/store/orders/user`,
 *     `/api/store/orders/[id]`), notifications (`/api/notifications/*`), mobile push tokens,
 *     product reviews (`/api/products/[id]/reviews`, `/api/store/products/[slug]/reviews`).
 *   - Denied: ALL `/api/admin/**` routes and ALL `/admin/**` server actions.
 *
 * - manager:
 *   - Allowed: operational catalog (`products`, `categories`, `variations`), `coupons`, `blogs`,
 *     `upload` (POST/DELETE product/blog media via API), `orders` (list/read/update status/tracking),
 *     `orders/[id]/photo` (GET/retry), `orders/[id]/invoice/regenerate`, `customers` (read),
 *     `reviews` (moderate), `settings` (`pixel`, `shipping`, `size-guide`, `google-drive`),
 *     own profile (`/api/admin/profile`), creating non-admin users (`customer`/`manager`).
 *   - Denied: `admin/invite` (staff invitations/demotions), `admin/settings/couriers` (API keys),
 *     `admin/orders/[id]/photo` DELETE, `admin/orders/[id]` DELETE, creating `admin` accounts,
 *     and `admin/media` Server Action `deleteMedia` (`admin`-only).
 *
 * - admin:
 *   - Allowed: full administrative access across all `/api/admin/**` routes and server actions.
 */

export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
} as const;

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

export interface AuthGuardSuccess {
  session: { user: AuthSessionUser };
  errorResponse: null;
}

export interface AuthGuardFailure {
  session: null;
  errorResponse: NextResponse;
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

export interface RequireAuthOptions {
  allowedRoles: readonly AppRole[];
  /**
   * When true, queries MongoDB User collection to ensure the account still exists
   * and still holds one of `allowedRoles` (recommended for sensitive mutations).
   */
  verifyDbRole?: boolean;
}

function buildAuthError(message: string, status: 401 | 403): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: PRIVATE_NO_STORE_HEADERS }
  );
}

/**
 * Centralized server-side authentication & authorization guard for Route Handlers.
 *
 * Security invariants:
 * - Never trusts an unverified `Authorization: Bearer` header.
 * - If a Bearer header is supplied, validates signature, exp, issuer, audience, and role via jose.
 *   Invalid Bearer headers fail immediately with 401 rather than silently falling back.
 * - Enforces deny-by-default role checks against `allowedRoles`.
 */
export async function requireAuthorizedSession(
  req: Request | undefined,
  options: RequireAuthOptions
): Promise<AuthGuardResult> {
  let user: AuthSessionUser | null = null;

  const authHeader = req?.headers.get('authorization');
  if (authHeader !== undefined && authHeader !== null && /^Bearer\s+/i.test(authHeader)) {
    const rawToken = extractBearerToken(authHeader);
    if (!rawToken) {
      return {
        session: null,
        errorResponse: buildAuthError('Unauthorized: Malformed Bearer token', 401),
      };
    }
    const verifiedBearer = await verifyBearerJwt(rawToken);
    if (!verifiedBearer) {
      return {
        session: null,
        errorResponse: buildAuthError('Unauthorized: Invalid or expired Bearer token', 401),
      };
    }
    user = verifiedBearer;
  } else {
    const nextAuthSession = await getServerSession(authOptions);
    const rawUser = nextAuthSession?.user as
      | { id?: string; email?: string | null; name?: string | null; role?: string }
      | undefined;

    if (!nextAuthSession || !rawUser) {
      return {
        session: null,
        errorResponse: buildAuthError('Unauthorized: Authentication required', 401),
      };
    }

    const role = typeof rawUser.role === 'string' ? rawUser.role : '';
    if (!ALLOWED_ROLES.includes(role as AppRole)) {
      return {
        session: null,
        errorResponse: buildAuthError('Forbidden: Invalid account role', 403),
      };
    }

    user = {
      id: typeof rawUser.id === 'string' ? rawUser.id : '',
      email: typeof rawUser.email === 'string' ? rawUser.email : '',
      name: typeof rawUser.name === 'string' ? rawUser.name : '',
      role: role as AppRole,
    };
  }

  if (!options.allowedRoles.includes(user.role)) {
    return {
      session: null,
      errorResponse: buildAuthError(
        options.allowedRoles.includes('admin') && options.allowedRoles.length === 1
          ? 'Forbidden: Administrator role required'
          : 'Forbidden: Insufficient permissions',
        403
      ),
    };
  }

  if (options.verifyDbRole) {
    await connectToDatabase();
    const lookupQuery =
      user.id && mongoose.Types.ObjectId.isValid(user.id)
        ? { _id: user.id }
        : user.email
          ? { email: user.email.toLowerCase() }
          : null;

    if (!lookupQuery) {
      return {
        session: null,
        errorResponse: buildAuthError('Unauthorized: Invalid session identity', 401),
      };
    }

    const dbUser = await User.findOne(lookupQuery).select('_id email name role').lean() as {
      _id: mongoose.Types.ObjectId;
      email: string;
      name: string;
      role: string;
    } | null;

    if (!dbUser || !ALLOWED_ROLES.includes(dbUser.role as AppRole)) {
      return {
        session: null,
        errorResponse: buildAuthError('Unauthorized: Account not found', 401),
      };
    }

    if (!options.allowedRoles.includes(dbUser.role as AppRole)) {
      return {
        session: null,
        errorResponse: buildAuthError('Forbidden: Account privileges revoked or insufficient', 403),
      };
    }

    user = {
      id: dbUser._id.toString(),
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as AppRole,
    };
  }

  return {
    session: { user },
    errorResponse: null,
  };
}

export async function requireAdminOrManager(
  req?: Request,
  verifyDbRole = false
): Promise<AuthGuardResult> {
  return requireAuthorizedSession(req, {
    allowedRoles: ['admin', 'manager'],
    verifyDbRole,
  });
}

export async function requireAdmin(
  req?: Request,
  verifyDbRole = true
): Promise<AuthGuardResult> {
  return requireAuthorizedSession(req, {
    allowedRoles: ['admin'],
    verifyDbRole,
  });
}

export async function requireAuthenticatedUser(
  req?: Request,
  verifyDbRole = false
): Promise<AuthGuardResult> {
  return requireAuthorizedSession(req, {
    allowedRoles: ['admin', 'manager', 'customer'],
    verifyDbRole,
  });
}

export function isValidObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value) && mongoose.Types.ObjectId.isValid(value);
}
