import { describe, expect, it } from 'vitest';
import {
  availableActions,
  canPerformAction,
  matchActionPreset,
  normalizeAllowedActions,
  profileForRole,
  profileWantsNewCard,
} from '../services/messengerBot/profiles.js';

describe('messengerBot profiles', () => {
  it('maps venue roles to profiles', () => {
    expect(profileForRole('restaurant_owner')).toBe('FOH');
    expect(profileForRole('manager')).toBe('FOH');
    expect(profileForRole('host')).toBe('HOST');
    expect(profileForRole('diner')).toBeNull();
  });

  it('exposes accept/reject only on pending for FOH', () => {
    const viewer = { profile: 'FOH' as const };
    expect(canPerformAction('accept', { status: 'pending' }, viewer)).toBe(true);
    expect(canPerformAction('seat', { status: 'pending' }, viewer)).toBe(false);
    expect(availableActions({ status: 'confirmed' }, viewer)).toEqual(
      expect.arrayContaining(['seat', 'complete', 'no_show', 'cancel']),
    );
  });

  it('limits HOST to floor actions', () => {
    const viewer = { profile: 'HOST' as const };
    expect(availableActions({ status: 'pending' }, viewer)).toEqual([]);
    expect(availableActions({ status: 'confirmed' }, viewer)).toEqual([
      'seat',
      'complete',
      'no_show',
    ]);
  });

  it('normalizes allowed actions and matches presets', () => {
    expect(normalizeAllowedActions('FOH', ['accept', 'reject', 'hack'])).toEqual([
      'accept',
      'reject',
    ]);
    expect(matchActionPreset('HOST', ['seat', 'complete', 'no_show'])).toBe('HOST');
    expect(matchActionPreset('FOH', ['accept'])).toBe('CUSTOM');
  });

  it('decides who gets a new card', () => {
    expect(profileWantsNewCard('APPROVER', 'pending')).toBe(true);
    expect(profileWantsNewCard('APPROVER', 'confirmed')).toBe(false);
    expect(profileWantsNewCard('HOST', 'confirmed')).toBe(true);
    expect(profileWantsNewCard('FOH', 'cancelled')).toBe(true);
  });
});
