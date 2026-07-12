// Copy helper with a fallback for non-secure contexts / older PWA webviews where
// the async Clipboard API is unavailable.
export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
}

// Share text via the native share sheet (PWA/mobile → WhatsApp, Messages, …),
// falling back to WhatsApp Web (then the clipboard) on desktop browsers without
// the Web Share API. Returns false only when the user cancels the share sheet.
export async function shareText(title: string, text: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch {
      // AbortError (user dismissed) or share failed — don't fall back on cancel.
      return false;
    }
  }
  const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const win = window.open(wa, '_blank');
  if (!win) await copyText(text);
  return true;
}
