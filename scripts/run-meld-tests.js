// Simple test harness to exercise meld logic from App-like functions
const assert = require('assert');

function makeTile(suit, value, idSuffix) {
  return { id: `${suit}_${value}_${idSuffix}`, suit, value, label: `${value}${suit}` };
}

// Minimal parts of App state and functions replicated for test
function simulate() {
  let hand = [];
  let meldMap = {};

  const setHand = (fnOrVal) => {
    hand = typeof fnOrVal === 'function' ? fnOrVal(hand) : fnOrVal;
  };
  const setMeldMap = (fnOrVal) => {
    meldMap = typeof fnOrVal === 'function' ? fnOrVal(meldMap) : fnOrVal;
  };

  function createOrToggleMeld(key, kind) {
    const baseKey = key.includes('@') ? key.split('@')[0] : key;
    const storageKey = `${baseKey}@${kind}`;

    if (kind === 'chow') {
      const [suit, valStr] = baseKey.split('_');
      const value = parseInt(valStr, 10);
      const existingKey = Object.keys(meldMap).find(k => meldMap[k].kind === 'chow' && meldMap[k].tiles.some(t => `${t.suit}_${t.value}` === baseKey));
      if (existingKey) {
        const tiles = meldMap[existingKey].tiles;
        setHand(prev => [...prev, ...tiles]);
        setMeldMap(prev => { const copy = { ...prev }; delete copy[existingKey]; return copy; });
        return;
      }

      for (let start = Math.max(1, value - 2); start <= Math.min(value, 7); start++) {
        const needVals = [start, start + 1, start + 2];
        const taken = [];
        const remaining = [];
        for (const t of hand) {
          if (t.suit === suit && needVals.includes(t.value) && !taken.some(x => x.id === t.id)) {
            const alreadyForValue = taken.find(x => x.value === t.value && x.suit === t.suit);
            if (!alreadyForValue) taken.push(t);
            else remaining.push(t);
          } else {
            remaining.push(t);
          }
        }
        if (taken.length === 3) {
          const seqKey = `${suit}_${start}`;
          const seqStorage = `${seqKey}@chow`;
          setHand(remaining);
          setMeldMap(prev => ({ ...prev, [seqStorage]: { kind: 'chow', tiles: taken } }));
          return;
        }
      }
      throw new Error('cannot chow');
    }

    if (meldMap[storageKey]) {
      const tiles = meldMap[storageKey].tiles;
      setHand(prev => [...prev, ...tiles]);
      setMeldMap(prev => { const copy = { ...prev }; delete copy[storageKey]; return copy; });
      return;
    }

    const need = kind === 'kong' ? 4 : 3;
    const taken = [];
    const remaining = [];
    for (const t of hand) {
      const k = `${t.suit}_${t.value}`;
      if (k === baseKey && taken.length < need) taken.push(t);
      else remaining.push(t);
    }
    if (taken.length < need) throw new Error('not enough tiles');
    setHand(remaining);
    setMeldMap(prev => ({ ...prev, [storageKey]: { kind, tiles: taken } }));
  }

  function upgradePungToKong(storageKey) {
    const entry = meldMap[storageKey];
    if (!entry || entry.kind !== 'pung') throw new Error('no pung');
    const tileKey = `${entry.tiles[0].suit}_${entry.tiles[0].value}`;
    const idx = hand.findIndex(t => `${t.suit}_${t.value}` === tileKey);
    if (idx === -1) throw new Error('no tile to upgrade');
    const tileToMove = hand[idx];
    const remainingHand = [...hand.slice(0, idx), ...hand.slice(idx + 1)];
    setMeldMap(prev => {
      const copy = { ...prev };
      delete copy[storageKey];
      const baseKey = storageKey.split('@')[0];
      copy[`${baseKey}@kong`] = { kind: 'kong', tiles: [...entry.tiles, tileToMove] };
      return copy;
    });
    setHand(remainingHand);
  }

  function handleMeldTileClick(meldKey, tileId) {
    const entry = meldMap[meldKey];
    if (!entry) throw new Error('no entry');
    if (entry.kind === 'kong') {
      const remainingTiles = entry.tiles.filter(t => t.id !== tileId);
      const baseKey = meldKey.split('@')[0];
      setMeldMap(prev => { const copy = { ...prev }; delete copy[meldKey]; copy[`${baseKey}@pung`] = { kind: 'pung', tiles: remainingTiles }; return copy; });
      const tile = entry.tiles.find(t => t.id === tileId);
      if (tile) setHand(prev => [...prev, tile]);
      return;
    }
    if (entry.kind === 'pung' || entry.kind === 'chow') {
      const remainingTiles = entry.tiles.filter(t => t.id !== tileId);
      setMeldMap(prev => { const copy = { ...prev }; delete copy[meldKey]; return copy; });
      if (remainingTiles.length > 0) setHand(prev => [...prev, ...remainingTiles]);
      return;
    }
  }

  return { hand, meldMap, setHand, setMeldMap, createOrToggleMeld, upgradePungToKong, handleMeldTileClick };
}

// Test scenario: start with 4 identical tiles in hand -> create kong -> click one tile in kong to downgrade to pung -> then click another tile in the downgraded pung to remove it and ensure remaining tile returns to hand
(function run() {
  const s = simulate();
  // build hand: 4x character_1
  s.setHand([makeTile('character', 1, 1), makeTile('character', 1, 2), makeTile('character', 1, 3), makeTile('character', 1, 4)]);
  // create kong
  s.createOrToggleMeld('character_1', 'kong');
  assert.strictEqual(Object.keys(s.meldMap).length, 1, 'expected 1 meld');
  const kongKey = Object.keys(s.meldMap)[0];
  assert.ok(kongKey.endsWith('@kong'));
  const kongTiles = s.meldMap[kongKey].tiles;
  // click one tile to downgrade
  const tileToClick = kongTiles[0].id;
  s.handleMeldTileClick(kongKey, tileToClick);
  // now we should have a pung at character_1@pung
  assert.ok(s.meldMap['character_1@pung'], 'expected pung after downgrade');
  assert.strictEqual(s.hand.length, 1, 'expected clicked tile moved back to hand');

  // click one tile from the pung (simulate removing it) -> remaining two tiles should return to hand
  const pungKey = 'character_1@pung';
  const pungTiles = s.meldMap[pungKey].tiles;
  const clickId = pungTiles[0].id;
  s.handleMeldTileClick(pungKey, clickId);

  // After removal, there should be no meld for character_1
  assert.strictEqual(!!s.meldMap['character_1@pung'], false, 'pung should be removed');
  // hand should now contain the previously clicked kong tile + the remaining two from the pung
  assert.strictEqual(s.hand.length, 3, `expected 3 tiles in hand, got ${s.hand.length}`);

  console.log('All meld tests passed');
})();
