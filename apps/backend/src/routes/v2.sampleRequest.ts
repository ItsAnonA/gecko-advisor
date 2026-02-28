/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";

export const sampleRequestV2Router = Router();

const SampleRequestSchema = z.object({
  domain: z.string().min(1).max(253),
  email: z.string().email().max(320),
});

/**
 * POST /api/v2/sample-request
 *
 * Rate limited: 3 requests per day per email via simple DB check.
 */
sampleRequestV2Router.post("/sample-request", async (req, res) => {
  const parsed = SampleRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return problem(res, 400, "Invalid request", parsed.error.issues[0]?.message);
  }

  const { domain, email } = parsed.data;

  try {
    // Simple rate limit: max 3 requests per day per email
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentCount = await prisma.sampleRequest.count({
      where: {
        email: email.toLowerCase().trim(),
        createdAt: { gte: today },
      },
    });

    if (recentCount >= 3) {
      return problem(res, 429, "Rate limit exceeded", "Maximum 3 sample requests per day.");
    }

    await prisma.sampleRequest.create({
      data: {
        domain: domain.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "We'll send the data within 24 hours.",
    });
  } catch (error) {
    logger.error({ err: error }, "[SampleRequest] Error creating sample request");
    return problem(res, 500, "Internal error");
  }
});
