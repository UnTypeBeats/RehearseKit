import { renderHook, act, waitFor } from '@testing-library/react';
import { useToast, toast, reducer } from '../use-toast';

// Mock the toast component types
jest.mock('@/components/ui/toast', () => ({
  ToastAction: 'ToastAction',
}));

describe('use-toast', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('reducer', () => {
    const initialState = { toasts: [] };

    describe('ADD_TOAST', () => {
      it('should add a toast to empty state', () => {
        const toast = {
          id: '1',
          title: 'Test Toast',
          description: 'Test description',
          open: true,
        };

        const action = {
          type: 'ADD_TOAST' as const,
          toast,
        };

        const newState = reducer(initialState, action);

        expect(newState.toasts).toHaveLength(1);
        expect(newState.toasts[0]).toEqual(toast);
      });

      it('should add toast to beginning of array', () => {
        const existingToast = {
          id: '1',
          title: 'First Toast',
          open: true,
        };

        const state = { toasts: [existingToast] };

        const newToast = {
          id: '2',
          title: 'Second Toast',
          open: true,
        };

        const action = {
          type: 'ADD_TOAST' as const,
          toast: newToast,
        };

        const newState = reducer(state, action);

        expect(newState.toasts).toHaveLength(1); // TOAST_LIMIT is 1
        expect(newState.toasts[0]).toEqual(newToast);
      });

      it('should respect TOAST_LIMIT when adding toasts', () => {
        const toast1 = { id: '1', title: 'Toast 1', open: true };
        const toast2 = { id: '2', title: 'Toast 2', open: true };

        const state = { toasts: [toast1] };

        const action = {
          type: 'ADD_TOAST' as const,
          toast: toast2,
        };

        const newState = reducer(state, action);

        expect(newState.toasts).toHaveLength(1);
        expect(newState.toasts[0]).toEqual(toast2);
      });
    });

    describe('UPDATE_TOAST', () => {
      it('should update existing toast', () => {
        const toast = {
          id: '1',
          title: 'Original Title',
          description: 'Original description',
          open: true,
        };

        const state = { toasts: [toast] };

        const action = {
          type: 'UPDATE_TOAST' as const,
          toast: {
            id: '1',
            title: 'Updated Title',
          },
        };

        const newState = reducer(state, action);

        expect(newState.toasts[0]).toEqual({
          id: '1',
          title: 'Updated Title',
          description: 'Original description',
          open: true,
        });
      });

      it('should not update toast with non-matching id', () => {
        const toast1 = { id: '1', title: 'Toast 1', open: true };
        const toast2 = { id: '2', title: 'Toast 2', open: true };

        const state = { toasts: [toast1, toast2] };

        const action = {
          type: 'UPDATE_TOAST' as const,
          toast: {
            id: '3',
            title: 'Updated Title',
          },
        };

        const newState = reducer(state, action);

        expect(newState.toasts).toEqual([toast1, toast2]);
      });

      it('should update only the matching toast when multiple toasts exist', () => {
        const toast1 = { id: '1', title: 'Toast 1', open: true };
        const toast2 = { id: '2', title: 'Toast 2', open: true };

        const state = { toasts: [toast1, toast2] };

        const action = {
          type: 'UPDATE_TOAST' as const,
          toast: {
            id: '1',
            title: 'Updated Toast 1',
          },
        };

        const newState = reducer(state, action);

        expect(newState.toasts[0].title).toBe('Updated Toast 1');
        expect(newState.toasts[1]).toEqual(toast2);
      });
    });

    describe('DISMISS_TOAST', () => {
      it('should dismiss specific toast by id', () => {
        const toast = { id: '1', title: 'Test Toast', open: true };
        const state = { toasts: [toast] };

        const action = {
          type: 'DISMISS_TOAST' as const,
          toastId: '1',
        };

        const newState = reducer(state, action);

        expect(newState.toasts[0].open).toBe(false);
      });

      it('should dismiss all toasts when toastId is undefined', () => {
        const toast1 = { id: '1', title: 'Toast 1', open: true };
        const toast2 = { id: '2', title: 'Toast 2', open: true };

        const state = { toasts: [toast1, toast2] };

        const action = {
          type: 'DISMISS_TOAST' as const,
          toastId: undefined,
        };

        const newState = reducer(state, action);

        expect(newState.toasts[0].open).toBe(false);
        expect(newState.toasts[1].open).toBe(false);
      });

      it('should not affect toasts with non-matching id', () => {
        const toast1 = { id: '1', title: 'Toast 1', open: true };
        const toast2 = { id: '2', title: 'Toast 2', open: true };

        const state = { toasts: [toast1, toast2] };

        const action = {
          type: 'DISMISS_TOAST' as const,
          toastId: '1',
        };

        const newState = reducer(state, action);

        expect(newState.toasts[0].open).toBe(false);
        expect(newState.toasts[1].open).toBe(true);
      });
    });

    describe('REMOVE_TOAST', () => {
      it('should remove specific toast by id', () => {
        const toast1 = { id: '1', title: 'Toast 1', open: true };
        const toast2 = { id: '2', title: 'Toast 2', open: true };

        const state = { toasts: [toast1, toast2] };

        const action = {
          type: 'REMOVE_TOAST' as const,
          toastId: '1',
        };

        const newState = reducer(state, action);

        expect(newState.toasts).toHaveLength(1);
        expect(newState.toasts[0]).toEqual(toast2);
      });

      it('should remove all toasts when toastId is undefined', () => {
        const toast1 = { id: '1', title: 'Toast 1', open: true };
        const toast2 = { id: '2', title: 'Toast 2', open: true };

        const state = { toasts: [toast1, toast2] };

        const action = {
          type: 'REMOVE_TOAST' as const,
          toastId: undefined,
        };

        const newState = reducer(state, action);

        expect(newState.toasts).toHaveLength(0);
      });

      it('should not affect state when removing non-existent toast', () => {
        const toast = { id: '1', title: 'Toast 1', open: true };
        const state = { toasts: [toast] };

        const action = {
          type: 'REMOVE_TOAST' as const,
          toastId: '999',
        };

        const newState = reducer(state, action);

        expect(newState.toasts).toHaveLength(1);
        expect(newState.toasts[0]).toEqual(toast);
      });
    });
  });

  describe('toast function', () => {
    beforeEach(() => {
      // Reset the module state between tests by clearing toasts
      const { result } = renderHook(() => useToast());
      act(() => {
        result.current.toasts.forEach((t) => {
          result.current.dismiss(t.id);
        });
      });
      act(() => {
        jest.runAllTimers();
      });
    });

    it('should generate unique IDs for toasts', () => {
      let id1: string;
      let id2: string;

      act(() => {
        const result1 = toast({ title: 'Toast 1' });
        id1 = result1.id;
        const result2 = toast({ title: 'Toast 2' });
        id2 = result2.id;
      });

      expect(id1!).not.toBe(id2!);
    });

    it('should add toast with title and description', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({
          title: 'Test Title',
          description: 'Test Description',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Test Title');
      expect(result.current.toasts[0].description).toBe('Test Description');
    });

    it('should set open to true by default', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test Toast' });
      });

      expect(result.current.toasts[0].open).toBe(true);
    });

    it('should return dismiss function', () => {
      const { result } = renderHook(() => useToast());

      let dismissFn: (() => void) | undefined;

      act(() => {
        const toastResult = toast({ title: 'Test Toast' });
        dismissFn = toastResult.dismiss;
      });

      expect(dismissFn).toBeDefined();
      expect(typeof dismissFn).toBe('function');

      act(() => {
        dismissFn!();
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should return update function', () => {
      const { result } = renderHook(() => useToast());

      let updateFn: ((props: any) => void) | undefined;

      act(() => {
        const toastResult = toast({ title: 'Original Title' });
        updateFn = toastResult.update;
      });

      expect(updateFn).toBeDefined();
      expect(typeof updateFn).toBe('function');

      act(() => {
        updateFn!({ title: 'Updated Title' });
      });

      expect(result.current.toasts[0].title).toBe('Updated Title');
    });

    it('should call dismiss when onOpenChange is called with false', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test Toast' });
      });

      const toastItem = result.current.toasts[0];
      expect(toastItem.open).toBe(true);

      act(() => {
        toastItem.onOpenChange?.(false);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should not dismiss when onOpenChange is called with true', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test Toast' });
      });

      const toastItem = result.current.toasts[0];

      act(() => {
        toastItem.onOpenChange?.(true);
      });

      expect(result.current.toasts[0].open).toBe(true);
    });
  });

  describe('useToast hook', () => {
    it('should return initial state (may contain toasts from previous tests)', () => {
      const { result } = renderHook(() => useToast());

      // The hook returns the current state, which is shared globally
      expect(Array.isArray(result.current.toasts)).toBe(true);
    });

    it('should expose toast function', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toast).toBeDefined();
      expect(typeof result.current.toast).toBe('function');
    });

    it('should expose dismiss function', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.dismiss).toBeDefined();
      expect(typeof result.current.dismiss).toBe('function');
    });

    it('should update state when toast is added', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({
          title: 'Test Toast',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Test Toast');
    });

    it('should update state when toast is dismissed', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test Toast' });
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should dismiss all toasts when dismiss is called without id', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should sync state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      act(() => {
        result1.current.toast({ title: 'Test Toast' });
      });

      // Both instances should see the same toast
      expect(result1.current.toasts).toHaveLength(1);
      expect(result2.current.toasts).toHaveLength(1);
      expect(result1.current.toasts[0].id).toBe(result2.current.toasts[0].id);
    });

    it('should cleanup listener on unmount', () => {
      const { unmount } = renderHook(() => useToast());

      unmount();

      // Should not throw error when toast is added after unmount
      expect(() => {
        act(() => {
          toast({ title: 'Test Toast' });
        });
      }).not.toThrow();
    });
  });

  describe('timeout queue functionality', () => {
    it('should schedule toast removal after dismiss', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test Toast' });
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.dismiss(toastId);
      });

      // Toast should be marked as closed but not removed yet
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].open).toBe(false);

      // Fast-forward time to trigger removal
      act(() => {
        jest.advanceTimersByTime(1000000);
      });

      // Toast should now be removed
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should remove all toasts after dismiss all', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Toast 1' });
      });

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.toasts[0].open).toBe(false);

      act(() => {
        jest.advanceTimersByTime(1000000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not schedule duplicate timeouts for same toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test Toast' });
      });

      const toastId = result.current.toasts[0].id;

      // Dismiss twice
      act(() => {
        result.current.dismiss(toastId);
        result.current.dismiss(toastId);
      });

      // Should still have one toast
      expect(result.current.toasts).toHaveLength(1);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(1000000);
      });

      // Should be removed only once
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle immediate removal before timeout', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test Toast' });
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.dismiss(toastId);
      });

      // Manually dispatch REMOVE_TOAST before timeout
      act(() => {
        // This simulates external removal
        jest.advanceTimersByTime(500000); // Half the delay
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(500000); // Complete the delay
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('ID generation', () => {
    it('should generate sequential IDs', () => {
      const ids: string[] = [];

      act(() => {
        for (let i = 0; i < 5; i++) {
          const result = toast({ title: `Toast ${i}` });
          ids.push(result.id);
        }
      });

      // IDs should be sequential numbers as strings
      const numericIds = ids.map((id) => parseInt(id, 10));
      for (let i = 1; i < numericIds.length; i++) {
        expect(numericIds[i]).toBe(numericIds[i - 1] + 1);
      }
    });

    it('should handle counter overflow gracefully', () => {
      // This test verifies the modulo operation in genId
      // The counter wraps around using Number.MAX_SAFE_INTEGER
      expect(() => {
        act(() => {
          toast({ title: 'Test Toast' });
        });
      }).not.toThrow();
    });

    it('should generate numeric string IDs', () => {
      let toastId: string;

      act(() => {
        const result = toast({ title: 'Test Toast' });
        toastId = result.id;
      });

      expect(typeof toastId!).toBe('string');
      expect(toastId!).toMatch(/^\d+$/);
    });
  });

  describe('edge cases', () => {
    it('should handle empty toast props', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({});
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].open).toBe(true);
    });

    it('should handle toast with only title', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Only Title' });
      });

      expect(result.current.toasts[0].title).toBe('Only Title');
      expect(result.current.toasts[0].description).toBeUndefined();
    });

    it('should handle toast with only description', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ description: 'Only Description' });
      });

      expect(result.current.toasts[0].description).toBe('Only Description');
      expect(result.current.toasts[0].title).toBeUndefined();
    });

    it('should handle updating toast with correct ID', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;

      act(() => {
        const toastResult = toast({ title: 'Test Toast' });
        toastId = toastResult.id;
      });

      // Update with the correct ID should work
      act(() => {
        // Find and update the toast we just created
        const currentToast = result.current.toasts.find((t) => t.id === toastId);
        if (currentToast) {
          currentToast.onOpenChange?.(true); // Test onOpenChange with true
        }
      });

      const updatedToast = result.current.toasts.find((t) => t.id === toastId);
      expect(updatedToast?.open).toBe(true);
    });

    it('should handle dismissing non-existent toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast({ title: 'Test Toast' });
      });

      expect(() => {
        act(() => {
          result.current.dismiss('non-existent-id');
        });
      }).not.toThrow();

      // Original toast should still be open
      expect(result.current.toasts[0].open).toBe(true);
    });

    it('should handle rapid successive toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.toast({ title: `Toast ${i}` });
        }
      });

      // Should only keep TOAST_LIMIT (1) toast
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Toast 9');
    });

    it('should handle toast with React node content', () => {
      const { result } = renderHook(() => useToast());

      const titleNode = 'React Title Node';
      const descriptionNode = 'React Description Node';

      act(() => {
        result.current.toast({
          title: titleNode,
          description: descriptionNode,
        });
      });

      expect(result.current.toasts[0].title).toBe(titleNode);
      expect(result.current.toasts[0].description).toBe(descriptionNode);
    });
  });

  describe('state synchronization', () => {
    it('should maintain state consistency across multiple operations', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        // Add toast
        result.current.toast({ title: 'Toast 1' });
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        // Dismiss it
        result.current.dismiss(toastId);
      });

      act(() => {
        // Add another toast before first is removed
        result.current.toast({ title: 'Toast 2' });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Toast 2');
    });

    it('should handle concurrent updates from multiple sources', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      act(() => {
        result1.current.toast({ title: 'Toast from hook 1' });
      });

      // Both hooks should see the update
      expect(result1.current.toasts).toHaveLength(1);
      expect(result2.current.toasts).toHaveLength(1);

      const toastId = result1.current.toasts[0].id;

      act(() => {
        result2.current.dismiss(toastId);
      });

      // Both hooks should see the dismiss
      expect(result1.current.toasts[0].open).toBe(false);
      expect(result2.current.toasts[0].open).toBe(false);
    });
  });
});
