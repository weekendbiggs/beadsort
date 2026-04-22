// Contact dispatcher. M3: log + counter for debugging. M7 swaps in the audio
// bus. Keeping this thin so milestones can attach without ripping wiring.
const listeners = new Set();

export function onContact(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function dispatch(c1, c2) {
  if (!c1 || !c2) return;
  const a = c1.userData || {};
  const b = c2.userData || {};
  for (const fn of listeners) fn(a, b, c1, c2);
}
