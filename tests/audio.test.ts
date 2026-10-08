import { describe, expect, it } from 'vitest';
import { isMuted, sfx, toggleMute } from '../src/ui/audio';

describe('audio', () => {
  it('no-op seguro sem AudioContext (Node) e mute alterna', () => {
    expect(() => {
      sfx.select();
      sfx.order();
      sfx.attack();
      sfx.error();
      sfx.build();
      sfx.advance();
      sfx.victory();
    }).not.toThrow();
    const before = isMuted();
    toggleMute();
    expect(isMuted()).toBe(!before);
    expect(() => sfx.select()).not.toThrow();
    toggleMute();
    expect(isMuted()).toBe(before);
  });
});
