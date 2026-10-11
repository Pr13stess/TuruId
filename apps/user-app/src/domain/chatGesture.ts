import { clamp, swipeAction } from "./chatGallery";

type Touch = { pageX: number; pageY: number };
type Frame = { scale: number; x: number; y: number };
export function photoGesture(width: number, height: number, render: (frame: Frame) => void,
  action: (value: "next" | "previous" | "close") => void) {
  let frame: Frame = { scale: 1, x: 0, y: 0 };
  let origin = { x: 0, y: 0 };
  let base = { ...frame };
  let distance = 0;
  let pinched = false;
  let previousCount = 0;
  const span = (touches: Touch[]) => Math.max(1, Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY));
  const rebase = (touches: Touch[]) => {
    base = { ...frame };
    if (touches[0]) origin = { x: touches[0].pageX, y: touches[0].pageY };
    distance = touches.length >= 2 ? span(touches) : 0;
    previousCount = touches.length;
  };
  return {
    begin(touches: Touch[]) { pinched = touches.length >= 2; rebase(touches); },
    move(touches: Touch[]) {
      if (!touches.length) return;
      if (touches.length >= 2) pinched = true;
      if (touches.length !== previousCount) { rebase(touches); return; }
      if (touches.length >= 2) {
        frame.scale = clamp(base.scale * span(touches) / distance, 1, 4);
        frame.x = clamp(frame.x, -width * (frame.scale - 1) / 2, width * (frame.scale - 1) / 2);
        frame.y = clamp(frame.y, -height * (frame.scale - 1) / 2, height * (frame.scale - 1) / 2);
      } else {
        const dx = touches[0].pageX - origin.x;
        const dy = touches[0].pageY - origin.y;
        frame.x = frame.scale > 1.01 ? clamp(base.x + dx, -width * (frame.scale - 1) / 2, width * (frame.scale - 1) / 2) : dx;
        frame.y = frame.scale > 1.01 ? clamp(base.y + dy, -height * (frame.scale - 1) / 2, height * (frame.scale - 1) / 2) : dy;
      }
      render({ ...frame });
    },
    end(cancelled = false) {
      const result = !cancelled && !pinched ? swipeAction(frame.x, frame.y, frame.scale) : null;
      if (frame.scale <= 1.01) { frame = { scale: 1, x: 0, y: 0 }; render({ ...frame }); }
      if (result) action(result);
    },
  };
}
