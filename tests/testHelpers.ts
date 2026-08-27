// tests/testHelpers.ts
import { describe, it, expect } from 'vitest';
import { Tile } from '../src/types/mahjong';
import { calculateHandFan } from '../src/engine/validator'; // 引入你的 calculateHandFan 函數路徑


export function makeTile(suit: Tile['suit'], value: number, idx: number): Tile {
  return { id: `${suit}_${value}_${idx}`, suit, value, label: `${value}${suit}` };
}


export function expectRuleScored(
  res: ReturnType<typeof calculateHandFan>, 
  ruleName: string, 
  expectedFan?: number
) {
  const target = res.breakdown.find(b => b.rule && b.rule.startsWith(ruleName));
  
  // 1. 確保 breakdown 裡面搵得到呢項規則
  expect(target).toBeDefined(); 
  
  // 2. 如果有指定 expectedFan，驗證分數係咪相符
  if (expectedFan !== undefined) {
    expect(target?.fan).toBe(expectedFan); 
  }
}