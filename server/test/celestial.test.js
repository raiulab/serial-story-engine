import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCelestialContext,
  getLunarQuarterContext,
  getMoonContext,
  getSolarContext
} from '../celestial.js';

test('celestial context is deterministic for a date', () => {
  const first = getCelestialContext('2026-01-01');
  const second = getCelestialContext('2026-01-01');
  assert.deepEqual(first, second);
  assert.ok(first.moon.age >= 0 && first.moon.age < 29.6);
  assert.ok(first.moon.illumination >= 0 && first.moon.illumination <= 100);
});

test('lunar quarter and solar context expose stable fields', () => {
  const quarter = getLunarQuarterContext('2026-01-01');
  const sun = getSolarContext('2026-01-01');
  assert.match(quarter.cycleId, /^-?\d+:[0-3]$/);
  assert.ok(quarter.progress >= 0 && quarter.progress <= 100);
  assert.equal(sun.name, '山羊座');
});

test('moon parser safely falls back for malformed input', () => {
  const moon = getMoonContext('not-a-date');
  assert.equal(typeof moon.key, 'string');
  assert.equal(moon.approximate, true);
});
