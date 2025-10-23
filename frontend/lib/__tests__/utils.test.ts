import { cn } from '../utils';

describe('lib/utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('class1', false && 'class2', 'class3');
      expect(result).toBe('class1 class3');
    });

    it('should merge Tailwind classes and resolve conflicts', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle complex Tailwind conflicts', () => {
      const result = cn('text-red-500 hover:text-blue-500', 'text-green-500');
      expect(result).toBe('hover:text-blue-500 text-green-500');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle single class', () => {
      const result = cn('single-class');
      expect(result).toBe('single-class');
    });

    it('should handle null and undefined', () => {
      const result = cn(null, undefined, 'class1');
      expect(result).toBe('class1');
    });

    it('should handle multiple null and undefined values', () => {
      const result = cn(null, 'class1', undefined, 'class2', null);
      expect(result).toBe('class1 class2');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle nested arrays', () => {
      const result = cn(['class1', ['class2', 'class3']], 'class4');
      expect(result).toBe('class1 class2 class3 class4');
    });

    it('should handle objects with boolean values', () => {
      const result = cn({ class1: true, class2: false, class3: true });
      expect(result).toBe('class1 class3');
    });

    it('should handle objects with conditional properties', () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn({
        'base-class': true,
        'active-class': isActive,
        'disabled-class': isDisabled,
      });
      expect(result).toBe('base-class active-class');
    });

    it('should handle empty strings', () => {
      const result = cn('', 'class1', '', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle complex combinations of types', () => {
      const result = cn(
        'base-class',
        { 'conditional-true': true, 'conditional-false': false },
        ['array-class1', 'array-class2'],
        undefined,
        null,
        '',
        'final-class'
      );
      expect(result).toContain('base-class');
      expect(result).toContain('conditional-true');
      expect(result).toContain('array-class1');
      expect(result).toContain('array-class2');
      expect(result).toContain('final-class');
      expect(result).not.toContain('conditional-false');
    });

    it('should handle Tailwind responsive classes', () => {
      const result = cn('text-sm md:text-base lg:text-lg');
      expect(result).toBe('text-sm md:text-base lg:text-lg');
    });

    it('should resolve conflicting responsive classes', () => {
      const result = cn('md:px-2', 'md:px-4');
      expect(result).toBe('md:px-4');
    });

    it('should handle Tailwind dark mode classes', () => {
      const result = cn('bg-white dark:bg-black');
      expect(result).toBe('bg-white dark:bg-black');
    });

    it('should resolve dark mode conflicts', () => {
      const result = cn('dark:bg-gray-800', 'dark:bg-black');
      expect(result).toBe('dark:bg-black');
    });

    it('should handle arbitrary values in Tailwind', () => {
      const result = cn('top-[117px]', 'top-[120px]');
      expect(result).toBe('top-[120px]');
    });

    it('should handle state variants like hover, focus, active', () => {
      const result = cn(
        'hover:bg-blue-500 focus:bg-blue-600 active:bg-blue-700'
      );
      expect(result).toBe('hover:bg-blue-500 focus:bg-blue-600 active:bg-blue-700');
    });

    it('should handle conflicting state variants', () => {
      const result = cn('hover:bg-red-500', 'hover:bg-blue-500');
      expect(result).toBe('hover:bg-blue-500');
    });

    it('should handle spacing utilities', () => {
      const result = cn('p-4 px-2', 'py-3');
      expect(result).toBe('p-4 px-2 py-3');
    });

    it('should handle conflicting spacing utilities', () => {
      const result = cn('p-4', 'p-6');
      expect(result).toBe('p-6');
    });

    it('should handle mixed utility types', () => {
      const result = cn(
        'flex items-center justify-between',
        'gap-2',
        'bg-white dark:bg-gray-900',
        'rounded-lg',
        'shadow-md'
      );
      expect(result).toContain('flex');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-between');
      expect(result).toContain('gap-2');
      expect(result).toContain('bg-white');
      expect(result).toContain('dark:bg-gray-900');
      expect(result).toContain('rounded-lg');
      expect(result).toContain('shadow-md');
    });

    it('should handle boolean false values', () => {
      const result = cn(false, 'class1', false, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle whitespace in class names', () => {
      const result = cn('  class1  ', '  class2  ');
      expect(result).toBe('class1 class2');
    });

    it('should handle duplicate class names', () => {
      const result = cn('class1', 'class2', 'class1');
      // clsx doesn't deduplicate non-Tailwind classes
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should preserve order when no conflicts exist', () => {
      const result = cn('z-10', 'absolute', 'top-0', 'left-0');
      expect(result).toBe('z-10 absolute top-0 left-0');
    });

    it('should handle important modifier', () => {
      const result = cn('!text-red-500', '!text-blue-500');
      expect(result).toBe('!text-blue-500');
    });

    it('should handle gradient utilities', () => {
      const result = cn('bg-gradient-to-r from-blue-500 to-purple-500');
      expect(result).toBe('bg-gradient-to-r from-blue-500 to-purple-500');
    });

    it('should handle animation classes', () => {
      const result = cn('animate-spin', 'animate-bounce');
      // tailwind-merge resolves conflicting animation classes
      // The last one wins
      expect(result).toBe('animate-bounce');
    });

    it('should handle zero values', () => {
      const result = cn(0 as any, 'class1');
      expect(result).toBe('class1');
    });

    it('should work with template literals', () => {
      const variant = 'primary';
      const size = 'lg';
      const result = cn(`btn-${variant}`, `btn-${size}`);
      expect(result).toBe('btn-primary btn-lg');
    });

    it('should handle edge case with all falsy values', () => {
      const result = cn(false, null, undefined, '', 0 as any);
      expect(result).toBe('');
    });

    it('should work in real-world component scenarios', () => {
      const isActive = true;
      const isDisabled = false;
      const variant = 'primary';

      const result = cn(
        'px-4 py-2 rounded-md font-medium transition-colors',
        {
          'bg-blue-500 text-white': variant === 'primary',
          'bg-gray-500 text-white': variant === 'secondary',
        },
        {
          'ring-2 ring-blue-300': isActive,
          'opacity-50 cursor-not-allowed': isDisabled,
        },
        'hover:bg-blue-600'
      );

      expect(result).toContain('px-4');
      expect(result).toContain('py-2');
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('text-white');
      expect(result).toContain('ring-2');
      expect(result).toContain('ring-blue-300');
      expect(result).toContain('hover:bg-blue-600');
      expect(result).not.toContain('opacity-50');
      expect(result).not.toContain('cursor-not-allowed');
    });
  });
});
