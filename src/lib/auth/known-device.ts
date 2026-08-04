import {
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";

const KNOWN_DEVICE_COOKIE =
  "ilkoku_known_device";
const ONE_YEAR =
  60 * 60 * 24 * 365;

function isValidDeviceToken(
  value: string,
) {
  return /^[A-Za-z0-9_-]{32,128}$/.test(
    value,
  );
}

export function createKnownDeviceToken() {
  return randomBytes(32).toString(
    "base64url",
  );
}

export function hashKnownDeviceToken(
  token: string,
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function getKnownDeviceToken() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(
      KNOWN_DEVICE_COOKIE,
    )?.value ?? "";

  return isValidDeviceToken(token)
    ? token
    : null;
}

export async function setKnownDeviceCookie(
  token: string,
) {
  if (!isValidDeviceToken(token)) {
    throw new Error(
      "INVALID_KNOWN_DEVICE_TOKEN",
    );
  }

  const cookieStore = await cookies();

  cookieStore.set(
    KNOWN_DEVICE_COOKIE,
    token,
    {
      httpOnly: true,
      maxAge: ONE_YEAR,
      path: "/",
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
    },
  );
}
