import test from 'node:test';
import assert from 'node:assert/strict';
import { countyFromMap, decimals, kmBetween, verdictFor } from '../verify-grounds.mjs';

const row = (o = {}) => ({ written: 'Takumi Park', name: 'Takumi Park', county: 'Limerick', lat: 52.632585, lon: -8.634402, ...o });
const pitch = { category: 'leisure', type: 'pitch', name: 'Takumi Park', display_name: 'Takumi Park, Raheen', address: { county: 'County Limerick' } };
const club = [{ km: 0.01, label: 'Old Crescent RFC', why: 'the club list has' }];

test('decimals and distance', () => {
  assert.equal(decimals(53.39), 2);
  assert.equal(decimals('53.480000'), 2);
  assert.equal(decimals(52.632585), 6);
  assert.ok(Math.abs(kmBetween(53, -6, 53, -6)) < 1e-9);
  assert.ok(Math.abs(kmBetween(53.0, -6.0, 53.01, -6.0) - 1.11) < 0.02);
});

test('the county the map names, and none when it names none', () => {
  assert.equal(countyFromMap({ county: 'County Cork' }), 'Cork');
  assert.equal(countyFromMap({ county: 'County Londonderry' }), 'Derry');
  assert.equal(countyFromMap({ state_district: 'Dublin' }), 'Dublin');
  assert.equal(countyFromMap({ state: 'Leinster' }), null);
});

test('rounded points, wrong counties and points outside Ireland are rejected', () => {
  assert.equal(verdictFor(row({ lat: 52.63, lon: -8.63 }), pitch, club).verdict, 'REJECT');
  // One long number is a real reading: 53.625 is exact in degrees-minutes-seconds.
  assert.equal(verdictFor(row({ lat: 53.625, lon: -8.180833, county: 'Roscommon' }), { ...pitch, address: { county: 'County Roscommon' } }, club).verdict, 'PASS');
  assert.equal(verdictFor(row(), { ...pitch, address: { county: 'County Clare' } }, club).verdict, 'REJECT');
  assert.equal(verdictFor(row({ lat: 48.1, lon: 11.5 }), null, []).verdict, 'REJECT');
});

test('a pass needs an independent sign: the map names the spot, or a matching club is close', () => {
  assert.equal(verdictFor(row(), pitch, []).verdict, 'PASS');
  assert.equal(verdictFor(row(), { ...pitch, name: 'Unnamed pitch', display_name: 'Rosbrien Road' }, club).verdict, 'PASS');
  assert.equal(verdictFor(row(), { ...pitch, name: 'Unnamed', display_name: 'Rosbrien Road' }, [{ km: 0.8, label: 'Far club', why: 'the club list has' }]).verdict, 'HOLD');
  assert.equal(verdictFor(row(), null, []).verdict, 'HOLD');
});

test('a bare town name is never placed, even when something is nearby', () => {
  assert.equal(verdictFor(row({ written: 'Galway', name: 'St Josephs College', county: 'Limerick' }), pitch, club).verdict, 'HOLD');
  assert.equal(verdictFor(row({ written: 'Waterford' }), pitch, club).verdict, 'HOLD');
});

test('a point on a road or in a town, with nothing naming the ground, is held', () => {
  const road = { category: 'highway', type: 'secondary', name: 'R515', display_name: 'R515, Milltown', address: { county: 'County Cork' } };
  assert.equal(verdictFor(row({ written: 'Charleville', name: '', county: 'Cork', lat: 52.348278, lon: -8.725475 }), road, []).verdict, 'HOLD');
  assert.equal(verdictFor(row({ lat: undefined }), null, []).verdict, 'HOLD');
});
