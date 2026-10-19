type Touch = { pageX: number; pageY: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Photo zoom only; page movement belongs to the native horizontal pager. */
export function propertyPhotoZoom(width: number, render: (scale: number, x: number) => void) {
  let scale = 1, x = 0, startX = 0, startScale = 1, startOffset = 0, distance = 1, count = 0;
  const span = (t: Touch[]) => Math.max(1, Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY));
  const begin = (t: Touch[]) => {
    count = t.length; startX = t[0]?.pageX ?? 0; startScale = scale; startOffset = x;
    distance = t.length >= 2 ? span(t) : 1;
  };
  return {
    begin,
    move(t: Touch[]) {
      if (!t.length) return;
      if (t.length !== count) { begin(t); return; }
      if (t.length >= 2) scale = clamp(startScale * span(t) / distance, 1, 4);
      else x = startOffset + t[0].pageX - startX;
      x = clamp(x, -width * (scale - 1) / 2, width * (scale - 1) / 2);
      render(scale, x);
    },
    end() { if (scale <= 1.01) { scale = 1; x = 0; } render(scale, x); },
  };
}
