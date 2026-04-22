// SFX preset map. Strings are jsfxr named presets ("click", "pickupCoin", etc).
// Objects are raw sfxr JSON parameter dumps from https://sfxr.me — paste new
// ones here as M11 polish replaces these defaults with handcrafted sounds.
export const PRESETS = {
  tick:        'click',         // bead → marble
  plink:       'blipSelect',    // bead → bead
  ding:        'pickupCoin',    // bead → porcelain (rim/floor)
  correct:     'pickupCoin',    // bead → correct dish (M11 will overlay a harmonic)
  wrong:       'hitHurt',       // bead → wrong dish (gentle, brief)
  pickup:      'blipSelect',    // (replaced by softPop in M11; kept as fallback)
  fwip:        'click',         // empty release
};
