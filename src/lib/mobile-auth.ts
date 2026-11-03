import { jwtVerify } from "jose";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { getJwtSecretKey } from "@/lib/jwt-secret";

export interface MobileSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Extracts and verifies the Bearer token from the request headers.
 */
export async function getBearerSession(req?: NextRequest | Request): Promise<MobileSession | null> {
  let authHeader = "";
  
  if (req) {
    authHeader = req.headers.get("authorization") || "";
  } else {
    // Try getting from next/headers if req isn't provided
    const headersList = await headers();
    authHeader = headersList.get("authorization") || "";
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return {
      user: {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      }
    };
  } catch (error) {
    console.error("Invalid Bearer token:", error);
    return null;
  }
}
