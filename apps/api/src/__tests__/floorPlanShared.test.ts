import { describe, expect, it } from 'vitest';
import {
  HistoryStack,
  findOverlappingIds,
  normalizeFloorAreaName,
  normalizeTableShape,
  removeFloorAreaAppearance,
  renameFloorAreaAppearance,
  resolveFloorAreaAppearance,
  sameFloorArea,
  snapWithAlignmentGuides,
  upsertFloorAreaAppearance,
} from '@reservations/shared';

describe('floorPlan shared helpers', () => {
  it('normalizes shapes', () => {
    expect(normalizeTableShape('booth')).toBe('booth');
    expect(normalizeTableShape('oval_high')).toBe('oval_high');
    expect(normalizeTableShape('Bad Shape!')).toBe('rect');
    expect(normalizeTableShape(null)).toBe('rect');
  });

  it('finds overlaps', () => {
    const ids = findOverlappingIds([
      { id: 'a', posX: 0, posY: 0, width: 2, height: 2 },
      { id: 'b', posX: 1, posY: 1, width: 2, height: 2 },
      { id: 'c', posX: 4, posY: 0, width: 2, height: 2 },
    ]);
    expect([...ids].sort()).toEqual(['a', 'b']);
  });

  it('snaps with guides', () => {
    const { layout, guides } = snapWithAlignmentGuides(
      { posX: 2.2, posY: 0, width: 2, height: 2 },
      [{ posX: 0, posY: 0, width: 2, height: 2 }],
      0.5,
    );
    expect(layout.posX).toBe(2);
    expect(guides.some((g) => g.orientation === 'vertical')).toBe(true);
  });

  it('history undo/redo', () => {
    const stack = new HistoryStack(1);
    stack.push(2);
    stack.push(3);
    expect(stack.undo()).toBe(2);
    expect(stack.redo()).toBe(3);
  });

  it('resolves per-area canvas appearance with restaurant fallback', () => {
    const appearances = [{ floorArea: 'Patio', backgroundColor: '#e4efe8', backgroundUrl: null }];
    expect(
      resolveFloorAreaAppearance('Patio', appearances, {
        backgroundColor: '#fafafa',
        backgroundUrl: null,
      }).backgroundColor,
    ).toBe('#e4efe8');
    expect(
      resolveFloorAreaAppearance('Main', appearances, {
        backgroundColor: '#abcdef',
        backgroundUrl: null,
      }).backgroundColor,
    ).toBe('#abcdef');
  });

  it('upserts area appearances by floor area', () => {
    const next = upsertFloorAreaAppearance(
      [{ floorArea: 'Main', backgroundColor: '#fff', backgroundUrl: null }],
      { floorArea: 'main', backgroundColor: '#000', backgroundUrl: null },
    );
    expect(next).toEqual([{ floorArea: 'main', backgroundColor: '#000', backgroundUrl: null }]);
  });

  it('normalizes and compares floor area names', () => {
    expect(normalizeFloorAreaName('  Patio  dining ')).toBe('Patio dining');
    expect(sameFloorArea('Patio', 'patio')).toBe(true);
    expect(sameFloorArea('Patio', 'Main')).toBe(false);
  });

  it('renames and removes area appearances', () => {
    const list = [
      { floorArea: 'Main', backgroundColor: '#fff', backgroundUrl: null },
      { floorArea: 'Patio', backgroundColor: '#e4efe8', backgroundUrl: 'https://x/y.jpg' },
    ];
    expect(renameFloorAreaAppearance(list, 'patio', 'Garden')).toEqual([
      { floorArea: 'Main', backgroundColor: '#fff', backgroundUrl: null },
      { floorArea: 'Garden', backgroundColor: '#e4efe8', backgroundUrl: 'https://x/y.jpg' },
    ]);
    expect(removeFloorAreaAppearance(list, 'PATIO')).toEqual([
      { floorArea: 'Main', backgroundColor: '#fff', backgroundUrl: null },
    ]);
  });
});
