/**
 * Terminal utility functions for ANSI escape sequences.
 */

/**
 * Generate an OSC 8 hyperlink escape sequence for terminal output.
 *
 * OSC 8 format: \x1b]8;;URL\x1b\TEXT\x1b]8;;\x1b\
 *
 * Respects the NO_COLOR environment variable and returns plain text when set.
 *
 * @param url - The URL to link to
 * @param text - The display text (defaults to URL if not provided)
 * @returns The formatted OSC 8 hyperlink string, or plain text if NO_COLOR is set
 */
export function hyperlink(url: string, text?: string): string {
  const displayText = text ?? url;
  if (process.env['NO_COLOR']) {
    return displayText;
  }
  return `\x1b]8;;${url}\x1b\\${displayText}\x1b]8;;\x1b\\`;
}
