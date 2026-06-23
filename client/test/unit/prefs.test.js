import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// prefs.js holds a module-level cache, so each test re-imports it fresh
// (vi.resetModules + dynamic import) to start from an empty cache.
let loadPrefs, savePrefs;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  ({ loadPrefs, savePrefs } = await import('../../src/lib/prefs.js'));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadPrefs', () => {
  it('should_return_just_the_version_when_nothing_is_stored', () => {
    expect(loadPrefs()).toEqual({ v: 1 });
  });

  it('should_read_and_parse_an_existing_fpt_prefs_object', () => {
    const stored = { v: 1, discounts: false, stations: ['Neste'], analyticsFuels: ['diesel'] };
    localStorage.setItem('fpt:prefs', JSON.stringify(stored));
    expect(loadPrefs()).toEqual(stored);
  });

  it('should_import_legacy_per_key_values_when_no_fpt_prefs_exists', () => {
    localStorage.setItem('showDiscounts', 'false');
    localStorage.setItem('selectedStations', 'CircleK,Virsi');
    localStorage.setItem('selectedFuels', '95,diesel');
    localStorage.setItem('historyPreset_v2', '30');
    localStorage.setItem('historyStartDate_v2', '2026-05-01');
    localStorage.setItem('historyEndDate_v2', '2026-05-20');
    expect(loadPrefs()).toEqual({
      v: 1,
      discounts: false,
      stations: ['CircleK', 'Virsi'],
      fuels: ['95', 'diesel'],
      historyPreset: '30',
      historyStart: '2026-05-01',
      historyEnd: '2026-05-20',
    });
  });

  it('should_import_discounts_true_from_the_legacy_string', () => {
    localStorage.setItem('showDiscounts', 'true');
    expect(loadPrefs().discounts).toBe(true);
  });

  it('should_prefer_fpt_prefs_over_legacy_keys', () => {
    localStorage.setItem('fpt:prefs', JSON.stringify({ v: 1, discounts: true }));
    localStorage.setItem('showDiscounts', 'false'); // should be ignored
    expect(loadPrefs()).toEqual({ v: 1, discounts: true });
  });

  it('should_fall_back_to_legacy_import_on_malformed_json', () => {
    localStorage.setItem('fpt:prefs', 'not-json{');
    localStorage.setItem('showDiscounts', 'false');
    expect(loadPrefs()).toEqual({ v: 1, discounts: false });
  });

  it('should_return_version_only_on_malformed_json_with_no_legacy', () => {
    localStorage.setItem('fpt:prefs', '}{');
    expect(loadPrefs()).toEqual({ v: 1 });
  });

  it('should_cache_the_first_read', () => {
    localStorage.setItem('fpt:prefs', JSON.stringify({ v: 1, discounts: true }));
    const first = loadPrefs();
    localStorage.setItem('fpt:prefs', JSON.stringify({ v: 1, discounts: false }));
    expect(loadPrefs()).toBe(first); // same cached reference, storage change ignored
  });
});

describe('savePrefs', () => {
  it('should_persist_a_patch_and_stamp_the_version', () => {
    savePrefs({ discounts: false });
    expect(JSON.parse(localStorage.getItem('fpt:prefs'))).toEqual({ v: 1, discounts: false });
  });

  it('should_merge_a_partial_update_into_the_existing_object', () => {
    localStorage.setItem('fpt:prefs', JSON.stringify({ v: 1, discounts: false, stations: ['Neste'] }));
    savePrefs({ discounts: true });
    expect(JSON.parse(localStorage.getItem('fpt:prefs'))).toEqual({
      v: 1,
      discounts: true,
      stations: ['Neste'],
    });
  });

  it('should_carry_legacy_imported_values_into_the_new_key_on_first_save', () => {
    localStorage.setItem('selectedStations', 'CircleK');
    savePrefs({ discounts: true });
    expect(JSON.parse(localStorage.getItem('fpt:prefs'))).toEqual({
      v: 1,
      stations: ['CircleK'],
      discounts: true,
    });
  });

  it('should_keep_the_cache_in_sync_so_a_following_load_sees_the_write', () => {
    savePrefs({ analyticsFuels: ['diesel'] });
    expect(loadPrefs().analyticsFuels).toEqual(['diesel']);
  });

  it('should_not_throw_when_storage_write_fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => savePrefs({ discounts: false })).not.toThrow();
  });
});
