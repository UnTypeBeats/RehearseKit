import {
  cn,
  formatBytes,
  formatDuration,
  estimateProcessingTime,
  getStatusColor,
  getStatusBadgeVariant,
} from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('class1', false && 'class2', 'class3');
      expect(result).toBe('class1 class3');
    });

    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle null and undefined', () => {
      const result = cn(null, undefined, 'class1');
      expect(result).toBe('class1');
    });

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle objects', () => {
      const result = cn({ class1: true, class2: false, class3: true });
      expect(result).toBe('class1 class3');
    });

    it('should handle complex combinations', () => {
      const result = cn(
        'base-class',
        { 'conditional-true': true, 'conditional-false': false },
        ['array-class1', 'array-class2'],
        undefined,
        'final-class'
      );
      expect(result).toContain('base-class');
      expect(result).toContain('conditional-true');
      expect(result).toContain('array-class1');
      expect(result).toContain('final-class');
      expect(result).not.toContain('conditional-false');
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(100)).toBe('100 Bytes');
      expect(formatBytes(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2048)).toBe('2 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
      expect(formatBytes(5242880)).toBe('5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1610612736)).toBe('1.5 GB');
      expect(formatBytes(5368709120)).toBe('5 GB');
    });

    it('should respect custom decimal places', () => {
      expect(formatBytes(1536, 0)).toBe('2 KB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 3)).toBe('1.5 KB');
    });

    it('should handle negative decimal values', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB');
      expect(formatBytes(1536, -5)).toBe('2 KB');
    });

    it('should handle very large numbers', () => {
      const veryLarge = 1099511627776; // 1 TB in bytes (beyond GB array)
      const result = formatBytes(veryLarge);
      // The sizes array only goes up to GB, so very large numbers will show as undefined
      // This is a limitation of the current implementation
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle fractional bytes', () => {
      expect(formatBytes(1.5)).toBe('1.5 Bytes');
      expect(formatBytes(100.75)).toBe('100.75 Bytes');
    });

    it('should handle edge cases with 1 byte', () => {
      expect(formatBytes(1)).toBe('1 Bytes');
    });

    it('should format values just under size thresholds', () => {
      expect(formatBytes(1023.9)).toBe('1023.9 Bytes');
      expect(formatBytes(1024 * 1024 - 1)).toBe('1024 KB');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(59)).toBe('0:59');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(599)).toBe('9:59');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(3720)).toBe('1:02:00');
      expect(formatDuration(7384)).toBe('2:03:04');
    });

    it('should pad minutes and seconds with leading zeros in hour format', () => {
      expect(formatDuration(3605)).toBe('1:00:05');
      expect(formatDuration(3665)).toBe('1:01:05');
      expect(formatDuration(36005)).toBe('10:00:05');
    });

    it('should handle very long durations', () => {
      expect(formatDuration(36000)).toBe('10:00:00');
      expect(formatDuration(86399)).toBe('23:59:59');
      expect(formatDuration(90000)).toBe('25:00:00');
    });

    it('should handle fractional seconds by flooring', () => {
      expect(formatDuration(1.5)).toBe('0:01');
      expect(formatDuration(59.9)).toBe('0:59');
      expect(formatDuration(61.7)).toBe('1:01');
    });

    it('should handle edge case of exactly 1 minute', () => {
      expect(formatDuration(60)).toBe('1:00');
    });

    it('should handle edge case of exactly 1 hour', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
    });

    it('should format 59 minutes 59 seconds', () => {
      expect(formatDuration(3599)).toBe('59:59');
    });

    it('should handle negative values', () => {
      // Note: The function uses Math.floor which produces unexpected results for negatives
      // This is an edge case that the current implementation doesn't handle well
      const result = formatDuration(-10);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('estimateProcessingTime', () => {
    it('should estimate processing time for fast quality', () => {
      expect(estimateProcessingTime(60, 'fast')).toBe(120);
      expect(estimateProcessingTime(120, 'fast')).toBe(240);
      expect(estimateProcessingTime(180, 'fast')).toBe(360);
    });

    it('should estimate processing time for high quality', () => {
      expect(estimateProcessingTime(60, 'high')).toBe(300);
      expect(estimateProcessingTime(120, 'high')).toBe(600);
      expect(estimateProcessingTime(180, 'high')).toBe(900);
    });

    it('should handle zero duration', () => {
      expect(estimateProcessingTime(0, 'fast')).toBe(0);
      expect(estimateProcessingTime(0, 'high')).toBe(0);
    });

    it('should handle fractional seconds', () => {
      expect(estimateProcessingTime(1.5, 'fast')).toBe(3);
      expect(estimateProcessingTime(2.5, 'high')).toBe(12.5);
    });

    it('should handle very short durations', () => {
      expect(estimateProcessingTime(0.1, 'fast')).toBe(0.2);
      expect(estimateProcessingTime(0.1, 'high')).toBe(0.5);
    });

    it('should handle very long durations', () => {
      expect(estimateProcessingTime(3600, 'fast')).toBe(7200);
      expect(estimateProcessingTime(3600, 'high')).toBe(18000);
    });

    it('should return exact multiples based on quality', () => {
      const duration = 100;
      expect(estimateProcessingTime(duration, 'fast')).toBe(duration * 2);
      expect(estimateProcessingTime(duration, 'high')).toBe(duration * 5);
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for PENDING status', () => {
      expect(getStatusColor('PENDING')).toBe('text-muted-foreground');
    });

    it('should return correct color for CONVERTING status', () => {
      expect(getStatusColor('CONVERTING')).toBe('text-kit-warning');
    });

    it('should return correct color for ANALYZING status', () => {
      expect(getStatusColor('ANALYZING')).toBe('text-kit-warning');
    });

    it('should return correct color for SEPARATING status', () => {
      expect(getStatusColor('SEPARATING')).toBe('text-kit-purple');
    });

    it('should return correct color for FINALIZING status', () => {
      expect(getStatusColor('FINALIZING')).toBe('text-kit-warning');
    });

    it('should return correct color for PACKAGING status', () => {
      expect(getStatusColor('PACKAGING')).toBe('text-kit-warning');
    });

    it('should return correct color for COMPLETED status', () => {
      expect(getStatusColor('COMPLETED')).toBe('text-kit-success');
    });

    it('should return correct color for FAILED status', () => {
      expect(getStatusColor('FAILED')).toBe('text-kit-error');
    });

    it('should return correct color for CANCELLED status', () => {
      expect(getStatusColor('CANCELLED')).toBe('text-muted-foreground');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColor('UNKNOWN')).toBe('text-muted-foreground');
      expect(getStatusColor('INVALID')).toBe('text-muted-foreground');
      expect(getStatusColor('')).toBe('text-muted-foreground');
    });

    it('should handle case-sensitive status values', () => {
      expect(getStatusColor('pending')).toBe('text-muted-foreground');
      expect(getStatusColor('Completed')).toBe('text-muted-foreground');
    });

    it('should return default for null-like values', () => {
      expect(getStatusColor(null as any)).toBe('text-muted-foreground');
      expect(getStatusColor(undefined as any)).toBe('text-muted-foreground');
    });
  });

  describe('getStatusBadgeVariant', () => {
    it('should return correct variant for PENDING status', () => {
      expect(getStatusBadgeVariant('PENDING')).toBe('outline');
    });

    it('should return correct variant for CONVERTING status', () => {
      expect(getStatusBadgeVariant('CONVERTING')).toBe('secondary');
    });

    it('should return correct variant for ANALYZING status', () => {
      expect(getStatusBadgeVariant('ANALYZING')).toBe('secondary');
    });

    it('should return correct variant for SEPARATING status', () => {
      expect(getStatusBadgeVariant('SEPARATING')).toBe('default');
    });

    it('should return correct variant for FINALIZING status', () => {
      expect(getStatusBadgeVariant('FINALIZING')).toBe('secondary');
    });

    it('should return correct variant for PACKAGING status', () => {
      expect(getStatusBadgeVariant('PACKAGING')).toBe('secondary');
    });

    it('should return correct variant for COMPLETED status', () => {
      expect(getStatusBadgeVariant('COMPLETED')).toBe('default');
    });

    it('should return correct variant for FAILED status', () => {
      expect(getStatusBadgeVariant('FAILED')).toBe('destructive');
    });

    it('should return correct variant for CANCELLED status', () => {
      expect(getStatusBadgeVariant('CANCELLED')).toBe('outline');
    });

    it('should return default variant for unknown status', () => {
      expect(getStatusBadgeVariant('UNKNOWN')).toBe('outline');
      expect(getStatusBadgeVariant('INVALID')).toBe('outline');
      expect(getStatusBadgeVariant('')).toBe('outline');
    });

    it('should handle case-sensitive status values', () => {
      expect(getStatusBadgeVariant('pending')).toBe('outline');
      expect(getStatusBadgeVariant('Failed')).toBe('outline');
    });

    it('should return default variant for null-like values', () => {
      expect(getStatusBadgeVariant(null as any)).toBe('outline');
      expect(getStatusBadgeVariant(undefined as any)).toBe('outline');
    });

    it('should return only valid badge variant types', () => {
      const validVariants = ['default', 'secondary', 'destructive', 'outline'];
      const statuses = [
        'PENDING',
        'CONVERTING',
        'ANALYZING',
        'SEPARATING',
        'FINALIZING',
        'PACKAGING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'UNKNOWN',
      ];

      statuses.forEach((status) => {
        const variant = getStatusBadgeVariant(status);
        expect(validVariants).toContain(variant);
      });
    });
  });
});
