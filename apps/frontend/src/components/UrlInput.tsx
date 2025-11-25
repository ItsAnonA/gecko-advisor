/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { normalizeUrl } from '@gecko-advisor/shared';

// ============================================================================
// Types
// ============================================================================

export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface UrlInputProps {
  /** Current URL value */
  value: string;
  /** Called when the URL value changes */
  onChange: (value: string) => void;
  /** Called when a valid URL is submitted (Enter key or button click) */
  onSubmit?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Debounce delay for validation in ms (default: 400) */
  debounceMs?: number;
  /** Whether to show recent scans dropdown (default: true) */
  showRecentScans?: boolean;
  /** Maximum recent scans to show (default: 5) */
  maxRecentScans?: number;
  /** ID for the input element */
  id?: string;
  /** Additional aria-describedby IDs */
  ariaDescribedBy?: string;
}

export interface UrlInputRef {
  /** Focus the input */
  focus: () => void;
  /** Get current validation state */
  getValidationState: () => ValidationState;
  /** Check if current URL is valid */
  isValid: () => boolean;
  /** Get the normalized URL if valid, null otherwise */
  getNormalizedUrl: () => string | null;
}

interface RecentScan {
  domain: string;
  url: string;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const RECENT_SCANS_KEY = 'gecko-advisor-recent-scans';
const MAX_RECENT_SCANS_STORAGE = 10;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates a URL using the shared normalizeUrl function.
 * Returns { valid: true, normalizedUrl } or { valid: false, error }
 */
function validateUrl(input: string): { valid: true; normalizedUrl: string; domain: string } | { valid: false; error: string } {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Please enter a URL' };
  }

  try {
    const normalized = normalizeUrl(input);
    return {
      valid: true,
      normalizedUrl: normalized.href,
      domain: normalized.hostname,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid URL';
    // Provide user-friendly error messages
    if (message.includes('private networks')) {
      return { valid: false, error: 'Cannot scan private or local networks' };
    }
    if (message.includes('dangerous protocol')) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }
    if (message.includes('empty or too long')) {
      return { valid: false, error: 'URL is too long (max 2048 characters)' };
    }
    return { valid: false, error: 'Please enter a valid website URL' };
  }
}

/**
 * Cleans and formats a URL for display.
 * Removes trailing slashes, protocol prefixes for cleaner display.
 */
function formatDisplayUrl(url: string): string {
  let cleaned = url.trim();
  // Remove protocol for display
  cleaned = cleaned.replace(/^https?:\/\//, '');
  // Remove trailing slash
  cleaned = cleaned.replace(/\/$/, '');
  // Remove www. for cleaner display
  cleaned = cleaned.replace(/^www\./, '');
  return cleaned;
}

/**
 * Extracts domain from a URL string
 */
function extractDomain(url: string): string | null {
  try {
    const normalized = normalizeUrl(url);
    return normalized.hostname;
  } catch {
    return null;
  }
}

/**
 * Retrieves recent scans from localStorage
 */
function getRecentScans(): RecentScan[] {
  try {
    const stored = localStorage.getItem(RECENT_SCANS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as RecentScan[];
    // Filter out old entries (older than 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return parsed.filter((scan) => scan.timestamp > thirtyDaysAgo);
  } catch {
    return [];
  }
}

/**
 * Saves a scan to recent scans in localStorage
 */
export function saveRecentScan(url: string): void {
  const domain = extractDomain(url);
  if (!domain) return;

  const scans = getRecentScans();
  // Remove existing entry for same domain
  const filtered = scans.filter((s) => s.domain !== domain);
  // Add new entry at the beginning
  const updated: RecentScan[] = [
    { domain, url, timestamp: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_SCANS_STORAGE);

  try {
    localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Custom Hook: useDebounce
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Subcomponents
// ============================================================================

interface ValidationIconProps {
  state: ValidationState;
  className?: string;
}

function ValidationIcon({ state, className = '' }: ValidationIconProps) {
  const baseClass = `w-5 h-5 transition-all duration-200 ${className}`;

  switch (state) {
    case 'validating':
      return (
        <svg
          className={`${baseClass} text-advisor-500 animate-spin`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      );

    case 'valid':
      return (
        <svg
          className={`${baseClass} text-green-500`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      );

    case 'invalid':
      return (
        <svg
          className={`${baseClass} text-red-500`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );

    default:
      return null;
  }
}

interface ClearButtonProps {
  onClick: () => void;
  visible: boolean;
}

function ClearButton({ onClick, visible }: ClearButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        p-1 rounded-full
        text-gecko-400 hover:text-gecko-600
        hover:bg-gray-100
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-advisor-500/50
      "
      aria-label="Clear URL input"
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

interface RecentScansDropdownProps {
  scans: RecentScan[];
  visible: boolean;
  onSelect: (url: string) => void;
  selectedIndex: number;
}

function RecentScansDropdown({
  scans,
  visible,
  onSelect,
  selectedIndex,
}: RecentScansDropdownProps) {
  if (!visible || scans.length === 0) return null;

  return (
    <div
      className="
        absolute top-full left-0 right-0 mt-1 z-50
        bg-white border border-gray-200 rounded-lg shadow-lg
        overflow-hidden
        animate-fadeIn
      "
      role="listbox"
      aria-label="Recent scans"
    >
      <div className="px-3 py-2 text-xs font-medium text-gecko-500 bg-gray-50 border-b border-gray-100">
        Recent Scans
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {scans.map((scan, index) => (
          <li
            key={scan.domain}
            role="option"
            aria-selected={index === selectedIndex}
            className={`
              px-3 py-2.5 cursor-pointer
              flex items-center gap-3
              transition-colors duration-150
              ${index === selectedIndex ? 'bg-advisor-50' : 'hover:bg-gray-50'}
            `}
            onClick={() => onSelect(scan.url)}
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${scan.domain}&sz=16`}
              alt=""
              width="16"
              height="16"
              className="flex-shrink-0 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-sm text-gecko-700 truncate">{scan.domain}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const UrlInput = forwardRef<UrlInputRef, UrlInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      placeholder = 'Enter any website (e.g., nytimes.com)',
      disabled = false,
      className = '',
      debounceMs = 400,
      showRecentScans = true,
      maxRecentScans = 5,
      id = 'url-input',
      ariaDescribedBy,
    },
    ref
  ) => {
    // Refs
    const inputRef = useRef<HTMLInputElement>(null);

    // State
    const [validationState, setValidationState] = useState<ValidationState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(-1);

    // Debounced value for validation
    const debouncedValue = useDebounce(value, debounceMs);

    // Get recent scans from localStorage
    const recentScans = useMemo(() => {
      if (!showRecentScans) return [];
      return getRecentScans().slice(0, maxRecentScans);
    }, [showRecentScans, maxRecentScans]);

    // Filter recent scans based on current input
    const filteredRecentScans = useMemo(() => {
      if (!value.trim()) return recentScans;
      const lowerValue = value.toLowerCase();
      return recentScans.filter((scan) =>
        scan.domain.toLowerCase().includes(lowerValue)
      );
    }, [recentScans, value]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      getValidationState: () => validationState,
      isValid: () => validationState === 'valid',
      getNormalizedUrl: () => normalizedUrl,
    }));

    // Validate URL when debounced value changes
    useEffect(() => {
      if (!debouncedValue.trim()) {
        setValidationState('idle');
        setErrorMessage(null);
        setNormalizedUrl(null);
        return;
      }

      setValidationState('validating');

      // Small delay to show validating state
      const timer = setTimeout(() => {
        const result = validateUrl(debouncedValue);

        if (result.valid) {
          setValidationState('valid');
          setErrorMessage(null);
          setNormalizedUrl(result.normalizedUrl);
        } else {
          setValidationState('invalid');
          setErrorMessage(result.error);
          setNormalizedUrl(null);
        }
      }, 50);

      return () => clearTimeout(timer);
    }, [debouncedValue]);

    // Handle input change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        // Reset dropdown selection on input change
        setSelectedDropdownIndex(-1);
      },
      [onChange]
    );

    // Handle paste - clean URL automatically
    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText) {
          // Clean the pasted URL
          const cleaned = pastedText.trim();
          // If it looks like a URL, use it directly
          if (cleaned.includes('.') || cleaned.includes('://')) {
            e.preventDefault();
            onChange(cleaned);
          }
        }
      },
      [onChange]
    );

    // Handle clear button click
    const handleClear = useCallback(() => {
      onChange('');
      inputRef.current?.focus();
    }, [onChange]);

    // Handle recent scan selection
    const handleRecentScanSelect = useCallback(
      (url: string) => {
        onChange(url);
        setShowDropdown(false);
        setSelectedDropdownIndex(-1);
        inputRef.current?.focus();
      },
      [onChange]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle dropdown navigation
        if (showDropdown && filteredRecentScans.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedDropdownIndex((prev) =>
              prev < filteredRecentScans.length - 1 ? prev + 1 : prev
            );
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedDropdownIndex((prev) => (prev > 0 ? prev - 1 : -1));
            return;
          }
          if (e.key === 'Escape') {
            setShowDropdown(false);
            setSelectedDropdownIndex(-1);
            return;
          }
          if (e.key === 'Enter' && selectedDropdownIndex >= 0) {
            const selectedScan = filteredRecentScans[selectedDropdownIndex];
            if (selectedScan) {
              e.preventDefault();
              handleRecentScanSelect(selectedScan.url);
              return;
            }
          }
        }

        // Handle submit
        if (e.key === 'Enter' && validationState === 'valid' && onSubmit) {
          e.preventDefault();
          onSubmit();
        }
      },
      [
        showDropdown,
        filteredRecentScans,
        selectedDropdownIndex,
        handleRecentScanSelect,
        validationState,
        onSubmit,
      ]
    );

    // Handle focus
    const handleFocus = useCallback(() => {
      setIsFocused(true);
      if (showRecentScans && recentScans.length > 0 && !value.trim()) {
        setShowDropdown(true);
      }
    }, [showRecentScans, recentScans.length, value]);

    // Handle blur
    const handleBlur = useCallback(() => {
      setIsFocused(false);
      // Delay hiding dropdown to allow click events
      setTimeout(() => {
        setShowDropdown(false);
        setSelectedDropdownIndex(-1);
      }, 200);
    }, []);

    // Compute border color based on state
    const borderColor = useMemo(() => {
      if (disabled) return 'border-gray-200';
      if (validationState === 'invalid') return 'border-red-400';
      if (validationState === 'valid') return 'border-green-400';
      if (isFocused) return 'border-advisor-500';
      return 'border-gray-200';
    }, [disabled, validationState, isFocused]);

    // Compute ring color for focus
    const ringColor = useMemo(() => {
      if (validationState === 'invalid') return 'focus:ring-red-500/30';
      if (validationState === 'valid') return 'focus:ring-green-500/30';
      return 'focus:ring-advisor-500/30';
    }, [validationState]);

    // Error message ID for aria-describedby
    const errorId = `${id}-error`;
    const combinedAriaDescribedBy = [
      errorMessage ? errorId : null,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`relative ${className}`}>
        {/* Input Container */}
        <div className="relative">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            onChange={handleChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={`
              w-full
              pl-6 pr-24 py-5 text-lg
              bg-light-elevated
              border-2 ${borderColor}
              rounded-xl
              focus:outline-none focus:ring-4 ${ringColor}
              transition-all duration-300
              text-gecko-900 placeholder-gecko-400
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label="Website URL to scan"
            aria-invalid={validationState === 'invalid'}
            aria-describedby={combinedAriaDescribedBy || undefined}
            role="combobox"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />

          {/* Right side icons container */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Clear button */}
            <ClearButton onClick={handleClear} visible={value.length > 0 && !disabled} />

            {/* Validation icon */}
            <ValidationIcon state={value.trim() ? validationState : 'idle'} />
          </div>
        </div>

        {/* Error message */}
        {errorMessage && validationState === 'invalid' && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className="
              mt-2 px-3 py-2
              text-sm text-red-600
              bg-red-50 border border-red-200
              rounded-lg
              flex items-center gap-2
              animate-fadeIn
            "
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* URL preview for valid URLs */}
        {validationState === 'valid' && normalizedUrl && (
          <div
            className="
              mt-2 px-3 py-1.5
              text-xs text-green-700
              bg-green-50 border border-green-200
              rounded-lg
              flex items-center gap-2
              animate-fadeIn
            "
            aria-live="polite"
          >
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="truncate">
              Will scan: <span className="font-medium">{formatDisplayUrl(normalizedUrl)}</span>
            </span>
          </div>
        )}

        {/* Recent scans dropdown */}
        <RecentScansDropdown
          scans={filteredRecentScans}
          visible={showDropdown && isFocused}
          onSelect={handleRecentScanSelect}
          selectedIndex={selectedDropdownIndex}
        />
      </div>
    );
  }
);

UrlInput.displayName = 'UrlInput';

export default UrlInput;
