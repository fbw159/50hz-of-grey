import { copyText } from './clipboard';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Native share sheet where available (phones), otherwise copy to clipboard. */
export async function shareText(title: string, text: string, url: string): Promise<ShareResult> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // fall through to copying
    }
  }
  return (await copyText(`${text} ${url}`)) ? 'copied' : 'failed';
}
