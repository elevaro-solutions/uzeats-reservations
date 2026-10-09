import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { BlogPost } from '../models/BlogPost.js';
import { signAccessToken } from '../services/auth.js';

const RECORD = `
  mutation RecordBlogPostRead($slug: String!) {
    recordBlogPostRead(slug: $slug) {
      id
      slug
      readCount
    }
  }
`;

const TOP = `
  query AdminTopBlogPosts($limit: Int) {
    adminTopBlogPosts(limit: $limit) {
      id
      slug
      readCount
    }
    adminBlogReadStats {
      totalReads
      publishedCount
      articleCount
    }
  }
`;

describe('Blog post read counts', () => {
  let agent: request.Agent;
  let adminToken: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const admin = await User.create({
      email: 'admin-blog-reads@test.com',
      passwordHash: 'unused',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    await BlogPost.create([
      {
        title: 'Popular Guide',
        slug: 'popular-guide',
        excerpt: 'Popular',
        bodyHtml: '<p>Hello</p>',
        status: 'published',
        publishedAt: new Date('2026-01-01'),
        authorId: admin._id,
        readCount: 5,
      },
      {
        title: 'Quiet Draft',
        slug: 'quiet-draft',
        excerpt: 'Draft',
        bodyHtml: '<p>Draft</p>',
        status: 'draft',
        authorId: admin._id,
        readCount: 99,
      },
      {
        title: 'New Post',
        slug: 'new-post',
        excerpt: 'New',
        bodyHtml: '<p>New</p>',
        status: 'published',
        publishedAt: new Date('2026-02-01'),
        authorId: admin._id,
        readCount: 0,
      },
    ]);
  });

  it('increments readCount for published posts only', async () => {
    const ok = await graphqlRequest(agent, RECORD, { slug: 'popular-guide' });
    expect(ok.body.errors).toBeUndefined();
    expect(ok.body.data.recordBlogPostRead.readCount).toBe(6);

    const again = await graphqlRequest(agent, RECORD, { slug: 'POPULAR-GUIDE' });
    expect(again.body.data.recordBlogPostRead.readCount).toBe(7);

    const draft = await graphqlRequest(agent, RECORD, { slug: 'quiet-draft' });
    expect(draft.body.errors).toBeUndefined();
    expect(draft.body.data.recordBlogPostRead).toBeNull();

    const missing = await graphqlRequest(agent, RECORD, { slug: 'no-such-slug' });
    expect(missing.body.data.recordBlogPostRead).toBeNull();
  });

  it('returns top published posts and aggregate stats for admins', async () => {
    const denied = await graphqlRequest(agent, TOP, { limit: 10 });
    expect(denied.body.errors?.[0]?.message).toMatch(/auth|forbidden|admin|login|unauthorized/i);

    const res = await graphqlRequest(agent, TOP, { limit: 10 }, adminToken);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.adminTopBlogPosts.map((p: { slug: string }) => p.slug)).toEqual([
      'popular-guide',
      'new-post',
    ]);
    expect(res.body.data.adminTopBlogPosts[0].readCount).toBe(7);
    expect(res.body.data.adminBlogReadStats).toEqual({
      totalReads: 106,
      publishedCount: 2,
      articleCount: 3,
    });
  });
});
