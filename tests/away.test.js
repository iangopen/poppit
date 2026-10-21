// The away bonus against the pacing sim: one hour away pays half of what helpers alone earn in one simulated hour
// (tools/sim32.js helperHour, the game's stepAuto and trySpawn) to within 15%, at the three checkpoints.
const test = require('node:test'), assert = require('node:assert');
const { play, PROFILES } = require('../tools/sim32.js');
for (const p of PROFILES) {
  test('away bonus vs measured helper income, ' + p[0], () => {
    const rs = play({}, p, false, true), c1 = rs[0], c6 = rs[5];
    assert.strictEqual(rs.length, 6);
    const points = [['first helper', c1.awayHelper, c1.idleHelper], ['first Fresh Batch', c1.awayReady, c1.idleReady], ['cycle 6 Fresh Batch', c6.awayReady, c6.idleReady]];
    for (const [name, away, idle] of points) {
      const ratio = away / (idle / 2);
      assert.ok(idle > 0 && ratio <= 1.15, name + ': away ' + Math.round(away) + ' is more than 15% over half of ' + Math.round(idle));
      assert.ok(ratio >= 0.85, name + ': away ' + Math.round(away) + ' is more than 15% under half of ' + Math.round(idle));
    }
  });
}
