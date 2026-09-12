import { describe, expect, it } from 'vitest';
import { getNumberPatternFlags, hasSevenGatesFlowers, isBigFiveGates, isSmallFiveGates, isVoidInOneSuit } from '../../../src/engine/validator.helpers';
import { SUIT, Tile } from '../../../src/types/mahjong';

const tile = (suit: Tile['suit'], value: number, id: number): Tile => ({
  id: `${suit}-${value}-${id}`,
  suit,
  value,
  label: `${suit}${value}`,
});

const chow = (suit: Tile['suit'], start: number, id: number): Tile[] =>
  [0, 1, 2].map(offset => tile(suit, start + offset, id + offset));


describe('數字類牌型', () => {
    it('detects 斷么九 and 缺五 without honors', () => {
    const hand = [
        ...chow(SUIT.CHARACTER, 2, 0),
        ...chow(SUIT.DOT, 2, 10),
        ...chow(SUIT.BAMBOO, 2, 20),
    ];
    const flags = getNumberPatternFlags(hand);
    expect(flags.duanYao).toBe(true);
    expect(flags.missingFive).toBe(true);
    });

    it('detects mixed and pure terminal patterns', () => {
    const mixed = [
        ...chow(SUIT.CHARACTER, 1, 0),
        ...chow(SUIT.DOT, 7, 10),
        tile(SUIT.WIND, 1, 20), tile(SUIT.WIND, 1, 21), tile(SUIT.WIND, 1, 22),
    ];
    const pure = [
        tile(SUIT.CHARACTER, 1, 30), tile(SUIT.CHARACTER, 1, 31), tile(SUIT.CHARACTER, 1, 32),
        tile(SUIT.DOT, 9, 40), tile(SUIT.DOT, 9, 41), tile(SUIT.DOT, 9, 42),
    ];
    expect(getNumberPatternFlags(mixed, undefined, '一萬-二萬-三萬, 七筒-八筒-九筒, 東x3').mixedYaoJiu).toBe(true);
    expect(getNumberPatternFlags(pure, undefined, '一萬x3, 九筒x3').pureYaoJiu).toBe(true);
    });

    it('detects mixed and pure 滿庭芳 patterns', () => {
    const combo = '一萬-二萬-三萬, 一筒-二筒-三筒, 一索x3, 東x3';
    const hand = [tile(SUIT.CHARACTER, 1, 0)];
    const flags = getNumberPatternFlags(hand, undefined, combo);
    expect(flags.mixedManting).toBe(true);
    expect(getNumberPatternFlags(hand, undefined, '四萬-五萬-六萬, 四筒-五筒-六筒').manting).toBe(true);
    });
});