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
import { sendEmail } from "./notifications.js";
import { logAudit } from "./audit.js";
import {
  getDocsAccessTokenFromRequest,
  setDocsAccessCookie,
} from "./authCookies.js";
import { isPlatformAdmin } from "@reservations/shared";
import { mapUser } from "../graphql/mappers.js";
import type { DocsAccessRequestDocument } from "../models/DocsAccessRequest.js";

const DOCS_ACCESS_JWT_EXPIRES = "30d";
const DOCS_OTP_TTL_MS = 10 * 60 * 1000;

interface DocsAccessJwtPayload {
  email: string;
  type: "docs_access";
}

const docsOtpStore = new Map<string, { code: string; expiresAt: number }>();

function useDevOtp() {
  return Boolean(env.AUTH_DEV_OTP) && env.NODE_ENV !== "production";
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
  const email = emailSchema.parse(rawEmail);
  const doc = await DocsAccessRequest.findOne({ email }).sort({
    updatedAt: -1,
  });
  const approved = await isEmailApproved(email);
  return {
    approved,
    pending: doc?.status === "pending",
    denied: doc?.status === "denied" && !approved,
  };
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
    return {
      success: true,
      message:
        "Your email already has access. Enter the verification code we email you to sign in.",
    };
  }

  const existing = await DocsAccessRequest.findOne({ email }).sort({
    updatedAt: -1,
  });
  if (existing?.status === "pending") {
    return {
      success: true,
      message: "Your access request is already pending review.",
    };
  }

  if (existing?.status === "denied") {
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
    return {
      success: true,
      message:
        "Access request submitted. We will notify you by email once reviewed.",
    };
  }

  await DocsAccessRequest.create({
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company,
    reason: input.reason,
    status: "pending",
  });

  return {
    success: true,
    message:
      "Access request submitted. We will notify you by email once reviewed.",
  };
}

export async function requestDocsAccessOtp(rawEmail: string) {
  const email = emailSchema.parse(rawEmail);
  if (!(await isEmailApproved(email))) {
    return {
      success: false,
      message:
        "This email does not have docs access yet. Submit an access request below.",
    };
  }

  const code = useDevOtp() ? "123456" : generateOtpCode();
  docsOtpStore.set(email, { code, expiresAt: Date.now() + DOCS_OTP_TTL_MS });

  if (useDevOtp()) {
    return {
      success: true,
      message: "Dev OTP: 123456",
    };
  }

  const rendered = await renderEmailTemplate("docs_access_otp", {
    code,
    email,
  });
  await sendEmail(email, rendered.subject, rendered.bodyText, {
    htmlBody: rendered.bodyHtml,
  });

  return {
    success: true,
    message:
      "Verification code sent. Check your inbox — it expires in 10 minutes.",
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
    throw new Error("Invalid verification code");
  }
  if (!(await isEmailApproved(email))) {
    throw new Error("Access has been revoked for this email");
  }

  const stored = docsOtpStore.get(email);
  const valid =
    !!stored && stored.code === code && stored.expiresAt > Date.now();
  if (!valid) {
    throw new Error("Invalid or expired verification code");
  }
  docsOtpStore.delete(email);

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
  return requestDocsAccessOtp(email);
}
