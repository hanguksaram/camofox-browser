const {
  LONG_TEXT_THRESHOLD,
  TYPE_TIMEOUT_BASE_MS,
  TYPE_TIMEOUT_MAX_MS,
  TYPE_TIMEOUT_PER_CHAR_MS,
  calculateTypeTimeoutMs,
  safePageClose,
  smartFill,
  withTimeout,
} = require('../../dist/src/services/tab');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('tab.ts utilities (unit)', () => {
  describe('withTimeout()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      // Ensure no timers leak between tests.
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('resolves when promise resolves before timeout', async () => {
      const resultPromise = withTimeout(Promise.resolve('ok'), 1000, 'test-op');
      await expect(resultPromise).resolves.toBe('ok');
      expect(jest.getTimerCount()).toBe(0);
    });

    test('rejects with timeout error when promise takes too long', async () => {
      const never = new Promise(() => {});
      const resultPromise = withTimeout(never, 1000, 'slow-op');

      jest.advanceTimersByTime(1000);
      await expect(resultPromise).rejects.toThrow('slow-op timed out after 1000ms');
      expect(jest.getTimerCount()).toBe(0);
    });

    test('includes label in timeout error message', async () => {
      const never = new Promise(() => {});
      const resultPromise = withTimeout(never, 250, 'label-xyz');

      jest.advanceTimersByTime(250);
      await expect(resultPromise).rejects.toThrow('label-xyz timed out after 250ms');
    });

    test('timer is properly cleaned up on success (no dangling timers)', async () => {
      const d = deferred();
      const resultPromise = withTimeout(d.promise, 5000, 'cleanup');

      // A timer should be set while the operation is in flight.
      expect(jest.getTimerCount()).toBe(1);

      d.resolve(123);
      await expect(resultPromise).resolves.toBe(123);
      expect(jest.getTimerCount()).toBe(0);
    });

    test('works with different types (generic)', async () => {
      const obj = { a: 1, b: 'two' };
      await expect(withTimeout(Promise.resolve(obj), 1000, 'generic')).resolves.toBe(obj);

      await expect(withTimeout(Promise.resolve(42), 1000, 'generic-number')).resolves.toBe(42);
    });

    test('rejects with original error when promise rejects before timeout', async () => {
      const err = new Error('boom');
      await expect(withTimeout(Promise.reject(err), 1000, 'reject-op')).rejects.toBe(err);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('calculateTypeTimeoutMs()', () => {
    test('uses the base timeout for short text', () => {
      expect(calculateTypeTimeoutMs('')).toBe(TYPE_TIMEOUT_BASE_MS);
      expect(calculateTypeTimeoutMs('short text')).toBe(TYPE_TIMEOUT_BASE_MS + 'short text'.length * TYPE_TIMEOUT_PER_CHAR_MS);
    });

    test('caps long text timeouts at the configured maximum', () => {
      expect(calculateTypeTimeoutMs('a'.repeat(5000))).toBe(TYPE_TIMEOUT_MAX_MS);
    });
  });

  describe('smartFill()', () => {
    test('uses bulk insert for long input text', async () => {
      const locator = {
        evaluate: jest
          .fn()
          .mockResolvedValueOnce({ isContentEditable: false, tagName: 'INPUT' })
          .mockResolvedValueOnce(undefined),
        fill: jest.fn(),
        focus: jest.fn(),
      };
      const page = {
        keyboard: {
          press: jest.fn(),
          insertText: jest.fn(),
        },
      };

      await smartFill(locator, page, 'x'.repeat(LONG_TEXT_THRESHOLD));

      expect(locator.evaluate).toHaveBeenCalledTimes(2);
      expect(locator.fill).not.toHaveBeenCalled();
      expect(page.keyboard.press).not.toHaveBeenCalled();
      expect(page.keyboard.insertText).not.toHaveBeenCalled();
    });

    test('keeps humanized typing for short contenteditable text', async () => {
      const locator = {
        evaluate: jest.fn().mockResolvedValue({ isContentEditable: true, tagName: 'DIV' }),
        fill: jest.fn(),
        focus: jest.fn().mockResolvedValue(undefined),
      };
      const page = {
        keyboard: {
          press: jest.fn().mockResolvedValue(undefined),
          insertText: jest.fn().mockResolvedValue(undefined),
        },
      };

      await smartFill(locator, page, 'short text');

      expect(locator.focus).toHaveBeenCalledTimes(1);
      expect(page.keyboard.press).toHaveBeenNthCalledWith(1, 'ControlOrMeta+a');
      expect(page.keyboard.press).toHaveBeenNthCalledWith(2, 'Backspace');
      expect(page.keyboard.insertText).toHaveBeenCalledWith('short text');
      expect(locator.fill).not.toHaveBeenCalled();
    });
  });

  describe('safePageClose()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    test('calls page.close() and completes', async () => {
      const page = { close: jest.fn().mockResolvedValue(undefined) };

      const resultPromise = safePageClose(page);
      await expect(resultPromise).resolves.toBeUndefined();

      expect(page.close).toHaveBeenCalledTimes(1);

      // safePageClose() schedules a 5s timer; flush it so it doesn't leak.
      jest.advanceTimersByTime(5000);
    });

    test('returns void even if page.close() throws', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const page = { close: jest.fn().mockRejectedValue(new Error('close failed')) };

      await expect(safePageClose(page)).resolves.toBeUndefined();

      expect(page.close).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0][0])).toContain('[camofox] page close failed:');

      jest.advanceTimersByTime(5000);
    });

    test('returns void if page.close() hangs (triggers 5s timeout)', async () => {
      const page = { close: jest.fn().mockImplementation(() => new Promise(() => {})) };

      const p = safePageClose(page);

      jest.advanceTimersByTime(4999);
      let settled = false;
      void p.then(() => {
        settled = true;
      });
      await Promise.resolve();
      expect(settled).toBe(false);

      jest.advanceTimersByTime(1);
      await expect(p).resolves.toBeUndefined();
      expect(page.close).toHaveBeenCalledTimes(1);
    });

    test('logs warning when page.close() fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const page = { close: jest.fn().mockRejectedValue(new Error('kaboom')) };

      await safePageClose(page);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(String(warnSpy.mock.calls[0][0])).toContain('page close failed');

      jest.advanceTimersByTime(5000);
    });
  });
});
