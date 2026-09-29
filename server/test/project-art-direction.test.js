import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROJECT_ART_DIRECTION,
  FULL_PROJECT_ART_DIRECTION,
  buildProjectArtDirectionContext
} from '../projectArtDirection.js';

test('public defaults are generic and consistent', () => {
  assert.equal(DEFAULT_PROJECT_ART_DIRECTION, FULL_PROJECT_ART_DIRECTION);
  assert.match(DEFAULT_PROJECT_ART_DIRECTION, /登録された物語設定/);
  assert.doesNotMatch(DEFAULT_PROJECT_ART_DIRECTION, /実在作家や既存作品の固有表現を模倣する/);
});

test('empty direction is disabled and populated direction includes purpose rule', () => {
  assert.equal(buildProjectArtDirectionContext(''), '');
  const value = buildProjectArtDirectionContext('soft daylight', 'image_generation');
  assert.match(value, /soft daylight/);
  assert.match(value, /構図、光、色、素材/);
});
