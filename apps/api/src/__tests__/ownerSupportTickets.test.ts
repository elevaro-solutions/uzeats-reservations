import { describe, it, expect, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createTestApp, graphqlRequest } from './helpers.js';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { signAccessToken } from '../services/auth.js';

const CREATE = `
  mutation CreateOwnerSupportTicket($input: CreateOwnerSupportTicketInput!) {
    createOwnerSupportTicket(input: $input) {
      id subject subjectKey description status priority category
      requesterId restaurantId assigneeId
      notes { id body }
      attachments { id url filename contentType size }
      restaurant { id name }
    }
  }
`;

const MY_TICKETS = `
  query MyOwnerSupportTickets {
    myOwnerSupportTickets {
      total
      items {
        id subject status requesterId assigneeId
        notes { id body visibleToRequester }
        attachments { id filename }
      }
    }
  }
`;

const MY_TICKET = `
  query MyOwnerSupportTicket($id: ID!) {
    myOwnerSupportTicket(id: $id) {
      id subject notes { id body authorId visibleToRequester }
      assigneeId
    }
  }
`;

const ADMIN_TICKETS = `
  query SupportTickets($restaurantId: ID) {
    supportTickets(restaurantId: $restaurantId) {
      items { id requesterId subject notes { body } }
    }
  }
`;

describe('Owner support tickets', () => {
  let agent: request.Agent;
  let ownerToken: string;
  let otherOwnerToken: string;
  let managerToken: string;
  let dinerToken: string;
  let adminToken: string;
  let ownerId: string;
  let staffId: string;
  let restaurantId: string;
  let otherRestaurantId: string;

  beforeAll(async () => {
    const collections = await mongoose.connection.db!.collections();
    for (const col of collections) await col.deleteMany({});
    const app = await createTestApp();
    agent = app.agent;

    const owner = await User.create({
      email: 'owner-ticket@test.com',
      passwordHash: 'unused',
      firstName: 'Olivia',
      lastName: 'Owner',
      role: 'restaurant_owner',
    });
    ownerId = owner._id.toString();
    ownerToken = signAccessToken({ sub: ownerId, role: 'restaurant_owner' });

    const otherOwner = await User.create({
      email: 'owner-ticket-other@test.com',
      passwordHash: 'unused',
      firstName: 'Owen',
      lastName: 'Other',
      role: 'restaurant_owner',
    });
    otherOwnerToken = signAccessToken({
      sub: otherOwner._id.toString(),
      role: 'restaurant_owner',
    });

    const staff = await User.create({
      email: 'owner-ticket-staff@test.com',
      passwordHash: 'unused',
      firstName: 'Sam',
      lastName: 'Staff',
      role: 'manager',
    });
    staffId = staff._id.toString();
    managerToken = signAccessToken({ sub: staffId, role: 'manager' });

    const diner = await User.create({
      email: 'owner-ticket-diner@test.com',
      passwordHash: 'unused',
      firstName: 'Dana',
      lastName: 'Diner',
      role: 'diner',
    });
    dinerToken = signAccessToken({ sub: diner._id.toString(), role: 'diner' });

    const admin = await User.create({
      email: 'owner-ticket-admin@test.com',
      passwordHash: 'unused',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'admin',
    });
    adminToken = signAccessToken({ sub: admin._id.toString(), role: 'admin' });

    const restaurant = await Restaurant.create({
      name: 'Owner Ticket Bistro',
      slug: 'owner-ticket-bistro',
      cuisine: 'American',
      priceRange: 2,
      address: { line1: '1 Test St', city: 'NYC', state: 'NY', zip: '10001' },
      location: { type: 'Point', coordinates: [-73.99, 40.73] },
      ownerId: owner._id,
      status: 'approved',
    });
    restaurantId = restaurant._id.toString();

    staff.restaurantIds = [restaurant._id];
    await staff.save();

    const otherRestaurant = await Restaurant.create({
      name: 'Other Owner Cafe',
      slug: 'other-owner-cafe',
      cuisine: 'Italian',
      priceRange: 2,
      address: { line1: '2 Test St', city: 'NYC', state: 'NY', zip: '10002' },
      location: { type: 'Point', coordinates: [-73.98, 40.74] },
      ownerId: otherOwner._id,
      status: 'approved',
    });
    otherRestaurantId = otherRestaurant._id.toString();
  });

  it('lets an owner open a ticket for their restaurant', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          subjectKey: 'restaurant_settings',
          description: 'The booking widget stopped accepting weekend parties of 8.',
          restaurantId,
        },
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const ticket = res.body.data.createOwnerSupportTicket;
    expect(ticket.requesterId).toBe(ownerId);
    expect(ticket.subjectKey).toBe('restaurant_settings');
    expect(ticket.category).toBe('restaurant');
    expect(ticket.status).toBe('open');
    expect(ticket.priority).toBe('normal');
    expect(ticket.assigneeId).toBeNull();
    expect(ticket.notes).toEqual([]);
    expect(ticket.restaurant?.name).toBe('Owner Ticket Bistro');
  });

  it('stores formatted HTML and image attachments for the owner', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          subjectKey: 'bug_report',
          description:
            '<p>The booking widget <strong>stopped accepting</strong> weekend parties.</p><script>alert(1)</script>',
          restaurantId,
          attachments: [
            {
              url: 'https://cdn.example.com/widget-error.png',
              key: 'uploads/widget-error.png',
              filename: 'widget-error.png',
              contentType: 'image/png',
              size: 2048,
            },
          ],
        },
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const ticket = res.body.data.createOwnerSupportTicket;
    expect(ticket.description).toContain('<strong>stopped accepting</strong>');
    expect(ticket.description).not.toMatch(/script/i);
    expect(ticket.attachments).toHaveLength(1);
    expect(ticket.attachments[0].filename).toBe('widget-error.png');
    expect(ticket.attachments[0].url).toBe('https://cdn.example.com/widget-error.png');
    expect(ticket.notes).toEqual([]);
    expect(ticket.assigneeId).toBeNull();
  });

  it('rejects HTML that is too short after tags are stripped', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE,
      { input: { subjectKey: 'bug_report', description: '<p><strong>Hi</strong></p>' } },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/10 characters/i);
  });

  it('rejects unsupported attachment types', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          subjectKey: 'bug_report',
          description: 'Here is a screenshot of the booking widget error.',
          attachments: [
            {
              url: 'https://cdn.example.com/notes.pdf',
              filename: 'notes.pdf',
              contentType: 'application/pdf',
              size: 1200,
            },
          ],
        },
      },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toBeTruthy();
  });

  it('lets assigned staff open a ticket for that restaurant', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          subjectKey: 'staff_access',
          description: 'I cannot see tonight’s floor plan after the last invite.',
          restaurantId,
        },
      },
      managerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const ticket = res.body.data.createOwnerSupportTicket;
    expect(ticket.requesterId).toBe(staffId);
    expect(ticket.restaurantId).toBe(restaurantId);
  });

  it('lists only the caller’s tickets and hides internal notes', async () => {
    const created = await SupportTicket.findOne({ requesterId: ownerId });
    expect(created).toBeTruthy();
    created!.notes.push({
      body: 'Internal follow-up',
      authorId: created!.requesterId,
      createdAt: new Date(),
    });
    await created!.save();

    const res = await graphqlRequest(agent, MY_TICKETS, undefined, ownerToken);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.myOwnerSupportTickets.total).toBe(2);
    const items = res.body.data.myOwnerSupportTickets.items;
    expect(items.every((ticket: { notes: unknown[] }) => ticket.notes.length === 0)).toBe(true);
    expect(items.every((ticket: { assigneeId: string | null }) => ticket.assigneeId === null)).toBe(
      true,
    );
    expect(
      items.some((ticket: { attachments: unknown[] }) => ticket.attachments.length > 0),
    ).toBe(true);
  });

  it('does not let another owner read the ticket', async () => {
    const created = await SupportTicket.findOne({ requesterId: ownerId });
    const res = await graphqlRequest(
      agent,
      MY_TICKET,
      { id: created!._id.toString() },
      otherOwnerToken,
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.myOwnerSupportTicket).toBeNull();
  });

  it('rejects tickets for restaurants the caller does not manage', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          subjectKey: 'billing_inquiry',
          description: 'Can I attach this billing question to someone else’s venue?',
          restaurantId: otherRestaurantId,
        },
      },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/forbidden/i);
  });

  it('rejects short descriptions', async () => {
    const res = await graphqlRequest(
      agent,
      CREATE,
      { input: { subjectKey: 'bug_report', description: 'too short' } },
      ownerToken,
    );
    expect(res.body.errors?.[0]?.message).toMatch(/10 characters/i);
  });

  it('blocks diners and anonymous callers', async () => {
    const asDiner = await graphqlRequest(
      agent,
      CREATE,
      {
        input: {
          subjectKey: 'general_inquiry',
          description: 'Can diners use the owner support mutation?',
        },
      },
      dinerToken,
    );
    expect(asDiner.body.errors?.[0]?.message).toMatch(/forbidden/i);

    const anon = await graphqlRequest(agent, CREATE, {
      input: {
        subjectKey: 'general_inquiry',
        description: 'I am not signed in but I have a question.',
      },
    });
    expect(anon.body.errors?.[0]?.message).toMatch(/auth/i);
  });

  it('still shows owner-created tickets in the admin queue', async () => {
    const res = await graphqlRequest(
      agent,
      ADMIN_TICKETS,
      { restaurantId },
      adminToken,
    );
    expect(res.body.errors).toBeUndefined();
    const match = res.body.data.supportTickets.items.find(
      (t: { requesterId: string; notes: Array<{ body: string }> }) =>
        t.requesterId === ownerId && t.notes[0]?.body === 'Internal follow-up',
    );
    expect(match).toBeTruthy();
    expect(match.notes[0]?.body).toBe('Internal follow-up');
  });

  it('shows staff replies to the owner and keeps internal notes hidden', async () => {
    const created = await SupportTicket.findOne({ requesterId: ownerId });
    expect(created).toBeTruthy();
    const ADD = `
      mutation AddSupportNote($ticketId: ID!, $body: String!, $visibleToRequester: Boolean) {
        addSupportNote(ticketId: $ticketId, body: $body, visibleToRequester: $visibleToRequester) {
          id
          notes { body visibleToRequester }
        }
      }
    `;
    const reply = await graphqlRequest(
      agent,
      ADD,
      {
        ticketId: created!._id.toString(),
        body: '<p>Please try the booking widget again after 5pm.</p>',
        visibleToRequester: true,
      },
      adminToken,
    );
    expect(reply.body.errors).toBeUndefined();

    const internal = await graphqlRequest(
      agent,
      ADD,
      {
        ticketId: created!._id.toString(),
        body: '<p>Internal: escalate to billing tomorrow.</p>',
        visibleToRequester: false,
      },
      adminToken,
    );
    expect(internal.body.errors).toBeUndefined();

    const res = await graphqlRequest(
      agent,
      MY_TICKET,
      { id: created!._id.toString() },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const notes = res.body.data.myOwnerSupportTicket.notes as Array<{ body: string }>;
    expect(notes.some((note) => note.body.includes('booking widget'))).toBe(true);
    expect(notes.some((note) => /Internal: escalate/i.test(note.body))).toBe(false);
    expect(res.body.data.myOwnerSupportTicket.assigneeId).toBeNull();
  });

  it('lets the requester reply in the conversation', async () => {
    const created = await SupportTicket.findOne({ requesterId: ownerId });
    expect(created).toBeTruthy();
    const REPLY = `
      mutation AddOwnerSupportReply(
        $ticketId: ID!
        $body: String!
        $attachments: [OwnerSupportAttachmentInput!]
      ) {
        addOwnerSupportReply(ticketId: $ticketId, body: $body, attachments: $attachments) {
          id status
          notes {
            body
            authorId
            visibleToRequester
            attachments { filename url }
          }
        }
      }
    `;
    const res = await graphqlRequest(
      agent,
      REPLY,
      {
        ticketId: created!._id.toString(),
        body: '<p>Thanks — I will try again tonight.</p>',
        attachments: [
          {
            url: 'https://cdn.example.com/follow-up.png',
            filename: 'follow-up.png',
            contentType: 'image/png',
            size: 2048,
          },
        ],
      },
      ownerToken,
    );
    expect(res.body.errors).toBeUndefined();
    const notes = res.body.data.addOwnerSupportReply.notes as Array<{
      body: string;
      authorId: string;
      visibleToRequester: boolean;
      attachments: Array<{ filename: string; url: string }>;
    }>;
    const reply = notes.find((note) => note.body.includes('try again tonight'));
    expect(reply?.visibleToRequester).toBe(true);
    expect(reply?.attachments).toEqual([
      expect.objectContaining({
        filename: 'follow-up.png',
        url: 'https://cdn.example.com/follow-up.png',
      }),
    ]);
    expect(notes.every((note) => note.authorId === ownerId || note.visibleToRequester)).toBe(true);

    const blocked = await graphqlRequest(
      agent,
      REPLY,
      {
        ticketId: created!._id.toString(),
        body: '<p>I should not be able to reply to this ticket.</p>',
      },
      otherOwnerToken,
    );
    expect(blocked.body.errors?.[0]?.message).toMatch(/not found/i);
  });
});
