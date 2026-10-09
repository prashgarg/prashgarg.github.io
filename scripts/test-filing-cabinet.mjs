import assert from 'node:assert/strict';
import { decodeSavedSlugs, toggleSavedSlug } from '../src/components/accessories/filingCabinetStore.ts';

assert.deepEqual(decodeSavedSlugs('["a","b","a",4]', ['a', 'b', 'c']), ['a', 'b']);
assert.deepEqual(decodeSavedSlugs('{"slugs":["c","missing"]}', ['a', 'b', 'c']), ['c']);
assert.deepEqual(toggleSavedSlug(['a'], 'b'), ['a', 'b']);
assert.deepEqual(toggleSavedSlug(['a', 'b'], 'a'), ['b']);
assert.deepEqual(decodeSavedSlugs(null, ['a']), []);
console.log('filing cabinet helpers passed');
