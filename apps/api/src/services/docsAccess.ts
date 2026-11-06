import { randomInt } from "node:crypto";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  emailSchema,
  requestDocsAccessInputSchema,
} from "@reservations/shared";
import { env } from "../config/env.js";
import { DocsAccessRequest } from "../models/DocsAccessRequest.js";
import { User } from "../models/User.js";
import type { UserDocument } from "../models/User.js";
import { renderEmailTemplate } from "./emailTemplates.js";
import { isEmailDeliveryConfigured, sendEmail } from "./notifications.js";
import { logAudit } from "./audit.js";
import {
  getDocsAccessTokenFromRequest,
  setDocsAccessCookie,
} from "./authCookies.js";
import { isPlatformAdmin } from "@reservations/shared";
import { mapUser } from "../graphql/mappers.js";
import type { DocsAccessRequestDocument } from "../models/DocsAccessRequest.js";
import { ForbiddenError, ValidationError } from "../lib/errors.js";
import { claimDocsOtpSend, consumeDocsOtp, storeDocsOtp } from "./docsOtpStore.js";
import { logger } from "../lib/logger.js";
import {
  emailDetailBox,
  emailMuted,
  emailParagraph,
} from "./emailBranding.js";

const DOCS_ACCESS_JWT_EXPIRES = "30d";
/** Denied emails can be submitted again after this, once. */
export const DOCS_ACCESS_REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const DOCS_OTP_PUBLIC_MESSAGE =
  "If this email has docs access, we sent a verification code. It expires in 10 minutes.";

export const DOCS_REQUEST_PUBLIC_MESSAGE =
  "If this email can request access, we recorded it. We will email you when there is an update.";

function ackDocsRequest() {
  return { success: true, message: DOCS_REQUEST_PUBLIC_MESSAGE };
}

interface DocsAccessJwtPayload {
  email: string;
  type: "docs_access";
}

function useDevOtp() {
  return Boolean(env.AUTH_DEV_OTP) && env.NODE_ENV !== "production";
}

function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function signDocsAccessToken(email: string) {
  const payload: DocsAccessJwtPayload = { email, type: "docs_access" };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: DOCS_ACCESS_JWT_EXPIRES,
  });
}

export function verifyDocsAccessJwt(
  token: string,
): DocsAccessJwtPayload | null {
  try {
    const payload = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET,
    ) as DocsAccessJwtPayload;
    if (payload.type !== "docs_access" || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

async function isEmailApproved(email: string) {
  const normalized = email.toLowerCase();
  const approved = await DocsAccessRequest.findOne({
    email: normalized,
    status: "approved",
  });
  if (approved) return true;

  const user = await User.findOne({ email: normalized });
  return Boolean(user && isPlatformAdmin(user.role));
}

function mapDocsAccessRequest(
  doc: DocsAccessRequestDocument,
  reviewer?: UserDocument | null,
) {
  return {
    id: doc._id.toString(),
    email: doc.email,
    firstName: doc.firstName ?? null,
    lastName: doc.lastName ?? null,
    company: doc.company ?? null,
    reason: doc.reason ?? null,
    status: doc.status,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    reviewedAt: doc.reviewedAt ?? null,
    reviewer: reviewer ? mapUser(reviewer) : null,
  };
}

function issueDocsSession(email: string, res: Response) {
  const accessToken = signDocsAccessToken(email);
  setDocsAccessCookie(res, accessToken);
  return { granted: true, email, accessToken };
}

export async function checkDocsAccessEmail(rawEmail: string) {
  emailSchema.parse(rawEmail);
  // Approval is not disclosed. The sign-in page sends a code or a request
  // and always shows the same copy, so this probe cannot be used to list
  // approved addresses.
  return { approved: false, pending: false, denied: false };
}

export async function getDocsAccessSession(req: Request) {
  let token = getDocsAccessTokenFromRequest(req);
  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ") && header.length > 7) {
      token = header.slice(7);
    }
  }
  if (!token) return { granted: false, email: null as string | null };
  const payload = verifyDocsAccessJwt(token);
  if (!payload) return { granted: false, email: null };
  const approved = await isEmailApproved(payload.email);
  if (!approved) return { granted: false, email: null };
  return { granted: true, email: payload.email };
}

export async function requestDocsAccess(rawInput: unknown) {
  const input = requestDocsAccessInputSchema.parse(rawInput);
  const email = input.email;

  if (await isEmailApproved(email)) {
    return ackDocsRequest();
  }

  const existing = await DocsAccessRequest.findOne({ email }).sort({
    updatedAt: -1,
  });
  if (existing?.status === "pending") {
    return ackDocsRequest();
  }

  if (existing?.status === "denied") {
    const stamp = existing.get("updatedAt") as Date | undefined;
    const updatedAtMs = stamp ? new Date(stamp).getTime() : 0;
    if (Date.now() - updatedAtMs < DOCS_ACCESS_REQUEST_COOLDOWN_MS) {
      return ackDocsRequest();
    }
    await DocsAccessRequest.findByIdAndUpdate(existing._id, {
      firstName: input.firstName ?? existing.firstName,
      lastName: input.lastName ?? existing.lastName,
      company: input.company ?? existing.company,
      reason: input.reason ?? existing.reason,
      status: "pending",
      reviewedById: undefined,
      reviewedAt: undefined,
      notes: undefined,
    });
    return ackDocsRequest();
  }

  await DocsAccessRequest.create({
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company,
    reason: input.reason,
    status: "pending",
  });

  return ackDocsRequest();
}

const DOCS_OTP_FALLBACK = {
  subject: "Your Tablevera docs verification code",
  bodyHtml: [
    emailParagraph("You requested access to <strong>Tablevera Docs</strong>."),
    emailParagraph(
      "Enter this verification code on the docs site. It expires in 10 minutes.",
    ),
    emailDetailBox([{ label: "Verification code", value: "{{code}}" }]),
    emailMuted(
      "If you did not request this code, you can safely ignore this email.",
    ),
  ].join(""),
  bodyText:
    "You requested access to Tablevera Docs.\n\nYour verification code: {{code}}\n\nThis code expires in 10 minutes. If you did not request it, ignore this email.",
};

function renderDocsOtpFallback(code: string) {
  return {
    subject: DOCS_OTP_FALLBACK.subject,
    bodyHtml: DOCS_OTP_FALLBACK.bodyHtml.replace(/\{\{code\}\}/g, code),
    bodyText: DOCS_OTP_FALLBACK.bodyText.replace(/\{\{code\}\}/g, code),
  };
}

export async function requestDocsAccessOtp(
  rawEmail: string,
  options?: { audience?: "public" | "admin" },
) {
  const audience = options?.audience ?? "public";
  const email = emailSchema.parse(rawEmail);
  const approved = await isEmailApproved(email);
  if (!approved) {
    if (audience === "admin") {
      return {
        success: false,
        message: "This email does not have docs access yet.",
      };
    }
    return { success: true, message: DOCS_OTP_PUBLIC_MESSAGE };
  }

  const allowed = await claimDocsOtpSend(email);
  if (!allowed) {
    if (audience === "admin") {
      return {
        success: false,
        message: "Please wait before sending another code to this email.",
      };
    }
    return { success: true, message: DOCS_OTP_PUBLIC_MESSAGE };
  }

  const code = useDevOtp() ? "123456" : generateOtpCode();
  try {
    await storeDocsOtp(email, code);
  } catch (err) {
    logger.error({ err, email }, "[docsAccess] failed to store OTP");
    throw new ValidationError(
      "Could not start verification. Please try again in a moment.",
    );
  }

  if (useDevOtp()) {
    return {
      success: true,
      message: "Dev OTP: 123456",
    };
  }

  if (!isEmailDeliveryConfigured()) {
    throw new ValidationError(
      "Could not send a verification email right now. Try again shortly.",
    );
  }

  let rendered: { subject: string; bodyHtml: string; bodyText: string };
  try {
    rendered = await renderEmailTemplate("docs_access_otp", {
      code,
      email,
    });
  } catch (err) {
    logger.warn(
      { err, email },
      "[docsAccess] docs_access_otp template missing; using fallback",
    );
    rendered = renderDocsOtpFallback(code);
  }

  try {
    await sendEmail(email, rendered.subject, rendered.bodyText, {
      htmlBody: rendered.bodyHtml,
    });
  } catch (err) {
    logger.error({ err, email }, "[docsAccess] failed to send OTP email");
    throw new ValidationError(
      "Could not send a verification email right now. Try again shortly.",
    );
  }

  return {
    success: true,
    message:
      audience === "admin"
        ? "Verification code sent. It expires in 10 minutes."
        : DOCS_OTP_PUBLIC_MESSAGE,
  };
}

export async function verifyDocsAccessOtp(
  rawEmail: string,
  rawCode: string,
  res: Response,
) {
  const email = emailSchema.parse(rawEmail);
  const code = rawCode.trim();
  if (!/^\d{4,8}$/.test(code)) {
    throw new ValidationError("Invalid verification code");
  }

  const valid = await consumeDocsOtp(email, code);
  if (!valid) {
    throw new ValidationError("Invalid or expired verification code");
  }
  if (!(await isEmailApproved(email))) {
    throw new ForbiddenError("Access has been revoked for this email");
  }

  return issueDocsSession(email, res);
}

export async function adminListDocsAccessRequests(args: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(args.limit ?? 20, 100);
  const offset = args.offset ?? 0;
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;
  if (args.search?.trim()) {
    const q = args.search.trim();
    filter.email = {
      $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }

  const [items, total] = await Promise.all([
    DocsAccessRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit),
    DocsAccessRequest.countDocuments(filter),
  ]);

  const reviewerIds = [
    ...new Set(items.map((i) => i.reviewedById?.toString()).filter(Boolean)),
  ];
  const reviewers = reviewerIds.length
    ? await User.find({ _id: { $in: reviewerIds } })
    : [];
  const reviewerById = new Map(reviewers.map((u) => [u._id.toString(), u]));

  return {
    items: items.map((doc) =>
      mapDocsAccessRequest(
        doc,
        doc.reviewedById ? reviewerById.get(doc.reviewedById.toString()) : null,
      ),
    ),
    total,
    limit,
    offset,
  };
}

export async function reviewDocsAccessRequest(
  id: string,
  status: "approved" | "denied",
  actorId: string,
  notes?: string | null,
) {
  if (status !== "approved" && status !== "denied") {
    throw new Error("Status must be approved or denied");
  }

  const doc = await DocsAccessRequest.findByIdAndUpdate(
    id,
    {
      status,
      reviewedById: actorId,
      reviewedAt: new Date(),
      notes: notes?.trim() || undefined,
    },
    { new: true },
  );
  if (!doc) throw new Error("Access request not found");

  await logAudit({
    actorId,
    action: `docsAccess.${status}`,
    resource: "DocsAccessRequest",
    resourceId: doc._id.toString(),
    details: { email: doc.email },
  });

  const reviewer = await User.findById(actorId);
  return mapDocsAccessRequest(doc, reviewer);
}

export async function grantDocsAccess(
  email: string,
  actorId: string,
  notes?: string | null,
) {
  const normalized = emailSchema.parse(email);
  let doc = await DocsAccessRequest.findOne({ email: normalized }).sort({
    updatedAt: -1,
  });

  if (doc) {
    doc = await DocsAccessRequest.findByIdAndUpdate(
      doc._id,
      {
        status: "approved",
        reviewedById: actorId,
        reviewedAt: new Date(),
        notes: notes?.trim() || doc.notes,
      },
      { new: true },
    );
  } else {
    doc = await DocsAccessRequest.create({
      email: normalized,
      status: "approved",
      reviewedById: actorId,
      reviewedAt: new Date(),
      notes: notes?.trim() || undefined,
    });
  }

  if (!doc) throw new Error("Failed to grant access");

  await logAudit({
    actorId,
    action: "docsAccess.grant",
    resource: "DocsAccessRequest",
    resourceId: doc._id.toString(),
    details: { email: normalized },
  });

  const reviewer = await User.findById(actorId);
  return mapDocsAccessRequest(doc, reviewer);
}

export async function adminSendDocsAccessOtp(email: string) {
  return requestDocsAccessOtp(email, { audience: "admin" });
}
