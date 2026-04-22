// SFX preset map. Strings are jsfxr named presets ("click", "pickupCoin", etc).
// Objects are raw sfxr JSON parameter dumps from https://sfxr.me — paste new
// ones here as M11 polish replaces these defaults with handcrafted sounds.
export const PRESETS = {
  tick:        'click',         // bead → marble
  plink:       'blipSelect',    // bead → bead
  ding:        'pickupCoin',    // bead → porcelain (rim/floor)
  correct:     'pickupCoin',    // bead → correct dish (M11 will overlay a harmonic)
  wrong:       'hitHurt',       // bead → wrong dish (gentle, brief)
  pickup:      'blipSelect',    // bead lifted by player
  fwip:        'click',         // empty release (cosmetic)
  arpeggio_a:  'pickupCoin',    // 3-note level-complete chime, played at 1.0x
  arpeggio_b:  'pickupCoin',    // ... 1.25x
  arpeggio_c:  'pickupCoin',    // ... 1.5x
};
