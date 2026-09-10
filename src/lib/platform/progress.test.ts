import {beforeEach, describe, expect, it, vi} from 'vitest';
import {completedCount, getLast, isChallengePassed, isComplete, toggleComplete} from './progress';

const KEY = 'cl-progress-v1';

class TestWindow extends EventTarget {
  private values = new Map<string, string>();

  localStorage = {
    getItem: (key: string) => this.values.get(key) ?? null,
    setItem: (key: string, value: string) => this.values.set(key, value),
  };
}

describe('progress storage', () => {
  let testWindow: TestWindow;

  beforeEach(() => {
    testWindow = new TestWindow();
    vi.stubGlobal('window', testWindow);
  });

  it('ignores malformed collections and remains writable', () => {
    testWindow.localStorage.setItem(
      KEY,
      JSON.stringify({completed: 'lesson-a', challenges: ['challenge-a']}),
    );

    expect(completedCount()).toBe(0);
    expect(isChallengePassed('challenge-a')).toBe(false);
    expect(() => toggleComplete('lesson-a')).not.toThrow();
    expect(isComplete('lesson-a')).toBe(true);
  });

  it('rejects malformed last-visited data while preserving valid progress', () => {
    testWindow.localStorage.setItem(
      KEY,
      JSON.stringify({completed: {'lesson-a': true}, last: {id: 'lesson-a', title: 42}}),
    );

    expect(completedCount()).toBe(1);
    expect(getLast()).toBeUndefined();
  });
});
