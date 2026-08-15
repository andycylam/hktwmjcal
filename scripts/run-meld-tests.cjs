const assert = require('assert');

function makeTile(suit, value, idSuffix) {
  return { id: `${suit}_${value}_${idSuffix}`, suit, value, label: `${value}${suit}` };
}

function simulate() {
  let hand = [];
  let meldMap = {};
  let selection = [];
  let huTileId = null;
  let huIsZimo = false;

  const setHand = (fnOrVal) => {
    hand = typeof fnOrVal === 'function' ? fnOrVal(hand) : fnOrVal;
  };
  const setMeldMap = (fnOrVal) => {
    meldMap = typeof fnOrVal === 'function' ? fnOrVal(meldMap) : fnOrVal;
  };
  const setSelection = (arr) => { selection = arr; };
  const toggleSelect = (id) => { selection = selection.includes(id) ? selection.filter(x => x !== id) : [...selection, id]; };
  const setHuTile = (id) => { huTileId = id; };
  const setHuIsZimo = (v) => { huIsZimo = v; };

  function createOrToggleMeld(key, kind) {
    const baseKey = key.includes('@') ? key.split('@')[0] : key;
    const storageKey = `${baseKey}@${kind}`;

    if (kind === 'shang') {
      const [suit, valStr] = baseKey.split('_');
      const value = parseInt(valStr, 10);
      const existingKey = Object.keys(meldMap).find(k => meldMap[k].kind === 'shang' && meldMap[k].tiles.some(t => `${t.suit}_${t.value}` === baseKey));
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
          const seqStorage = `${seqKey}@shang`;
          setHand(remaining);
          setMeldMap(prev => ({ ...prev, [seqStorage]: { kind: 'shang', tiles: taken } }));
          return;
        }
      }
      throw new Error('cannot shang');
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

  // create meld from current selection (auto-detect kong > pung > shang)
  function createMeldFromSelection() {
    const tiles = hand.filter(t => selection.includes(t.id));
    if (tiles.length === 0) throw new Error('no selection');
    const first = tiles[0];
    const allSame = tiles.every(t => t.suit === first.suit && t.value === first.value);
    if (tiles.length === 4 && allSame) {
      const key = `${first.suit}_${first.value}`;
      const storageKey = `${key}@kong`;
      const remaining = hand.filter(t => !selection.includes(t.id));
      setHand(remaining);
      setMeldMap(prev => ({ ...prev, [storageKey]: { kind: 'kong', tiles } }));
      setSelection([]);
      return;
    }
    if (tiles.length === 3 && allSame) {
      const key = `${first.suit}_${first.value}`;
      const storageKey = `${key}@pung`;
      const remaining = hand.filter(t => !selection.includes(t.id));
      setHand(remaining);
      setMeldMap(prev => ({ ...prev, [storageKey]: { kind: 'pung', tiles } }));
      setSelection([]);
      return;
    }
    if (tiles.length === 3) {
      const suit = tiles[0].suit;
      const vals = tiles.map(t => t.value).sort((a,b) => a-b);
      if (tiles.every(t => t.suit === suit) && vals[1] === vals[0]+1 && vals[2] === vals[1]+1) {
        const seqKey = `${suit}_${vals[0]}`;
        const storageKey = `${seqKey}@shang`;
        const remaining = hand.filter(t => !selection.includes(t.id));
        setHand(remaining);
        setMeldMap(prev => ({ ...prev, [storageKey]: { kind: 'shang', tiles } }));
        setSelection([]);
        return;
      }
    }
    throw new Error('cannot detect meld');
  }

  function createHuFromSelection() {
    if (selection.length !== 1) throw new Error('select one for hu');
    setHuTile(selection[0]);
    setSelection([]);
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
    if (entry.kind === 'pung' || entry.kind === 'shang') {
      const remainingTiles = entry.tiles.filter(t => t.id !== tileId);
      setMeldMap(prev => { const copy = { ...prev }; delete copy[meldKey]; return copy; });
      if (remainingTiles.length > 0) setHand(prev => [...prev, ...remainingTiles]);
      return;
    }
  }

  return {
    getHand: () => hand,
    getMeldMap: () => meldMap,
    setHand,
    setMeldMap,
    createOrToggleMeld,
    upgradePungToKong,
    handleMeldTileClick,
    setSelection,
    setHuTile,
    setHuIsZimo,
    createMeldFromSelection,
    createHuFromSelection,
    toggleSelect
  };
}

// lightweight scoring replicate of validator behavior for tests
function calculateHandFanLike(handTiles, meldMap, huIsZimo) {
  const meldTiles = [];
  if (meldMap) Object.values(meldMap).forEach(m => meldTiles.push(...m.tiles));
  const all = [...handTiles, ...meldTiles];
  let totalFan = 1;
  const breakdown = [{ rule: '底番 (Base Point)', fan: 1 }];
  const hasHonor = all.some(t => t.suit === 'wind' || t.suit === 'dragon');
  if (hasHonor) { totalFan += 1; breakdown.push({ rule: '字牌 (Honor Tile)', fan: 1 }); }
  if (huIsZimo) { totalFan += 1; breakdown.push({ rule: '自摸 (Zimo)', fan: 1 }); }
  if (meldMap) {
    const concealedKongs = Object.values(meldMap).filter(m => m.kind === 'kong' && m.concealed).length;
    if (concealedKongs > 0) { totalFan += concealedKongs; breakdown.push({ rule: `暗槓 x${concealedKongs}`, fan: concealedKongs }); }
  }
  return { totalFan, breakdown };
}

// Test scenario: start with 4 identical tiles in hand -> create kong -> click one tile in kong to downgrade to pung -> then click another tile in the downgraded pung to remove it and ensure tiles return to hand
(function run() {
  const s = simulate();
  s.setHand([makeTile('wan', 1, 1), makeTile('wan', 1, 2), makeTile('wan', 1, 3), makeTile('wan', 1, 4)]);
  s.createOrToggleMeld('wan_1', 'kong');
  const meldMap = s.getMeldMap();
  if (Object.keys(meldMap).length !== 1) throw new Error('expected 1 meld');
  const kongKey = Object.keys(meldMap)[0];
  if (!kongKey.endsWith('@kong')) throw new Error('expected kong key');
  const kongTiles = meldMap[kongKey].tiles;
  const tileToClick = kongTiles[0].id;
  s.handleMeldTileClick(kongKey, tileToClick);
  const meldMap2 = s.getMeldMap();
  if (!meldMap2['wan_1@pung']) throw new Error('expected pung after downgrade');
  if (s.getHand().length !== 1) throw new Error('expected clicked tile moved back to hand');
  const pungKey = 'wan_1@pung';
  const pungTiles = meldMap2[pungKey].tiles;
  const clickId = pungTiles[0].id;
  s.handleMeldTileClick(pungKey, clickId);
  const meldMap3 = s.getMeldMap();
  if (!!meldMap3['wan_1@pung']) throw new Error('pung should be removed');
  if (s.getHand().length !== 3) throw new Error(`expected 3 tiles in hand, got ${s.getHand().length}`);
  console.log('All meld tests passed');
})();

// Additional tests: pung, shang, upgrade, concealed toggle
(function more() {
  const s = simulate();

  // pung test
  s.setHand([makeTile('wan', 2, 1), makeTile('wan', 2, 2), makeTile('wan', 2, 3)]);
  s.createOrToggleMeld('wan_2', 'pung');
  const m1 = s.getMeldMap();
  if (!m1['wan_2@pung']) throw new Error('pung creation failed');
  if (s.getHand().length !== 0) throw new Error('hand should be empty after pung');

  // shang test (1-2-3 sou)
  s.setHand([makeTile('sou', 1, 1), makeTile('sou', 2, 2), makeTile('sou', 3, 3)]);
  s.createOrToggleMeld('sou_2', 'shang');
  const m2 = s.getMeldMap();
  if (!Object.keys(m2).some(k => k.endsWith('@shang'))) throw new Error('shang creation failed');

  // upgrade pung -> kong
  s.setHand([makeTile('wan', 3, 1), makeTile('wan', 3, 2), makeTile('wan', 3, 3), makeTile('wan', 3, 4)]);
  s.createOrToggleMeld('wan_3', 'pung');
  // put one more wan_3 into hand to upgrade
  s.setHand(prev => [...prev, makeTile('wan', 3, 5)]);
  s.upgradePungToKong('wan_3@pung');
  const m3 = s.getMeldMap();
  if (!m3['wan_3@kong']) throw new Error('upgrade to kong failed');

  // toggle concealed flag on kong entry
  s.setMeldMap(prev => {
    const copy = { ...prev };
    if (copy['wan_3@kong']) copy['wan_3@kong'].concealed = true;
    return copy;
  });
  const m4 = s.getMeldMap();
  if (!m4['wan_3@kong'] || !m4['wan_3@kong'].concealed) throw new Error('concealed toggle failed');

  // cleanup
  console.log('Additional meld tests passed');
})();

// Comprehensive tests
(function comprehensive() {
  const s = simulate();

  // 1) selection-based kong -> downgrade -> remove
  s.setHand([makeTile('wan', 1, 1), makeTile('wan', 1, 2), makeTile('wan', 1, 3), makeTile('wan', 1, 4)]);
  s.setSelection([s.getHand()[0].id, s.getHand()[1].id, s.getHand()[2].id, s.getHand()[3].id]);
  s.createMeldFromSelection();
  let mm = s.getMeldMap();
  if (!Object.keys(mm).some(k => k.endsWith('@kong'))) throw new Error('selection kong failed');
  const kongKey = Object.keys(mm).find(k => k.endsWith('@kong'));
  const kongTiles = mm[kongKey].tiles;
  s.handleMeldTileClick(kongKey, kongTiles[0].id);
  mm = s.getMeldMap();
  if (!mm['wan_1@pung']) throw new Error('downgrade to pung failed');
  s.handleMeldTileClick('wan_1@pung', mm['wan_1@pung'].tiles[0].id);
  mm = s.getMeldMap();
  if (mm['wan_1@pung']) throw new Error('pung should be removed');

  // 2) shang creation via selection
  s.setHand([makeTile('sou', 4, 1), makeTile('sou', 5, 2), makeTile('sou', 6, 3)]);
  s.setSelection([s.getHand()[0].id, s.getHand()[1].id, s.getHand()[2].id]);
  s.createMeldFromSelection();
  mm = s.getMeldMap();
  if (!Object.keys(mm).some(k => k.endsWith('@shang'))) throw new Error('selection shang failed');

  // 3) create hu and zimo scoring
  s.setHand([makeTile('wan', 9, 1)]); // hu tile
  s.setSelection([s.getHand()[0].id]);
  s.createHuFromSelection();
  s.setHuIsZimo(true);
  const score = calculateHandFanLike(s.getHand(), s.getMeldMap(), true);
  if (!score.breakdown.some(b => b.rule === '自摸 (Zimo)')) throw new Error('zimo scoring missing');

  // 4) concealed kong scoring
  s.setHand([makeTile('wan', 7, 1), makeTile('wan', 7, 2), makeTile('wan', 7, 3), makeTile('wan', 7, 4)]);
  s.createOrToggleMeld('wan_7', 'kong');
  s.setMeldMap(prev => { const copy = { ...prev }; if (copy['wan_7@kong']) copy['wan_7@kong'].concealed = true; return copy; });
  const score2 = calculateHandFanLike(s.getHand(), s.getMeldMap(), false);
  if (!score2.breakdown.some(b => b.rule.startsWith('暗槓'))) throw new Error('concealed scoring missing');

  console.log('Comprehensive tests passed');
})();
