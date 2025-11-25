/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import { Router } from "express";
import { CreateBlogPostSchema, UpdateBlogPostSchema } from "@gecko-advisor/shared";
import { prisma } from "../prisma.js";
import { problem } from "../problem.js";
import { logger } from "../logger.js";
import { adminGuard } from "../middleware/admin.js";

export const blogV2Router = Router();

/**
 * GET /api/v2/blog/posts
 * List published blog posts with pagination (public)
 */
blogV2Router.get('/blog/posts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    // Get total count of published posts
    const totalCount = await prisma.blogPost.count({
      where: { status: 'PUBLISHED' },
    });

    // Fetch published posts ordered by publishedAt descending
    const posts = await prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        readTimeMinutes: true,
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      items: posts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching blog posts');
    return problem(res, 500, 'Failed to load blog posts');
  }
});

/**
 * GET /api/v2/blog/posts/:slug
 * Get a single published blog post by slug (public)
 */
blogV2Router.get('/blog/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return problem(res, 404, 'Blog post not found');
    }

    // Only return published posts to public (unless admin)
    const isAdmin = req.header('X-Admin-Key') === process.env.ADMIN_API_KEY;
    if (post.status !== 'PUBLISHED' && !isAdmin) {
      return problem(res, 404, 'Blog post not found');
    }

    res.json(post);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error fetching blog post');
    return problem(res, 500, 'Failed to load blog post');
  }
});

/**
 * POST /api/v2/blog/posts
 * Create a new blog post (admin only)
 */
blogV2Router.post('/blog/posts', adminGuard, async (req, res) => {
  try {
    const parsed = CreateBlogPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid blog post data', parsed.error.flatten());
    }

    const { slug, title, excerpt, content, coverImage, metaTitle, metaDescription, status, publishedAt, readTimeMinutes } = parsed.data;

    // Check if slug already exists
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      return problem(res, 409, 'Blog post with this slug already exists');
    }

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title,
        excerpt,
        content,
        coverImage: coverImage ?? null,
        metaTitle: metaTitle ?? null,
        metaDescription: metaDescription ?? null,
        status,
        publishedAt: publishedAt ? new Date(publishedAt) : (status === 'PUBLISHED' ? new Date() : null),
        readTimeMinutes,
      },
    });

    logger.info({ postId: post.id, slug: post.slug }, 'Blog post created');
    res.status(201).json(post);
  } catch (error) {
    logger.error({ error }, 'Error creating blog post');
    return problem(res, 500, 'Failed to create blog post');
  }
});

/**
 * PUT /api/v2/blog/posts/:slug
 * Update an existing blog post (admin only)
 */
blogV2Router.put('/blog/posts/:slug', adminGuard, async (req, res) => {
  try {
    const { slug } = req.params;

    const parsed = UpdateBlogPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return problem(res, 400, 'Invalid blog post data', parsed.error.flatten());
    }

    // Check if post exists
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, status: true, publishedAt: true },
    });

    if (!existing) {
      return problem(res, 404, 'Blog post not found');
    }

    // If changing slug, check new slug doesn't exist
    if (parsed.data.slug && parsed.data.slug !== slug) {
      const slugExists = await prisma.blogPost.findUnique({
        where: { slug: parsed.data.slug },
        select: { id: true },
      });

      if (slugExists) {
        return problem(res, 409, 'Blog post with this slug already exists');
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (parsed.data.slug !== undefined) updateData.slug = parsed.data.slug;
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.excerpt !== undefined) updateData.excerpt = parsed.data.excerpt;
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
    if (parsed.data.coverImage !== undefined) updateData.coverImage = parsed.data.coverImage ?? null;
    if (parsed.data.metaTitle !== undefined) updateData.metaTitle = parsed.data.metaTitle ?? null;
    if (parsed.data.metaDescription !== undefined) updateData.metaDescription = parsed.data.metaDescription ?? null;
    if (parsed.data.readTimeMinutes !== undefined) updateData.readTimeMinutes = parsed.data.readTimeMinutes;

    // Handle status and publishedAt
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
      // If publishing for the first time, set publishedAt
      if (parsed.data.status === 'PUBLISHED' && !existing.publishedAt) {
        updateData.publishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date();
      }
    }
    if (parsed.data.publishedAt !== undefined) {
      updateData.publishedAt = new Date(parsed.data.publishedAt);
    }

    const post = await prisma.blogPost.update({
      where: { slug },
      data: updateData,
    });

    logger.info({ postId: post.id, slug: post.slug }, 'Blog post updated');
    res.json(post);
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error updating blog post');
    return problem(res, 500, 'Failed to update blog post');
  }
});

/**
 * DELETE /api/v2/blog/posts/:slug
 * Delete a blog post (admin only)
 */
blogV2Router.delete('/blog/posts/:slug', adminGuard, async (req, res) => {
  try {
    const { slug } = req.params;

    // Check if post exists
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return problem(res, 404, 'Blog post not found');
    }

    await prisma.blogPost.delete({
      where: { slug },
    });

    logger.info({ slug }, 'Blog post deleted');
    res.status(204).send();
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Error deleting blog post');
    return problem(res, 500, 'Failed to delete blog post');
  }
});
