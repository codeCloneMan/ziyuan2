interface FingerInfo {
  hand: 'left' | 'right'
  finger: number
  row: number
  col: number
}

const KEY_MAP: Record<string, FingerInfo> = {
  q: { hand: 'left', finger: 0, row: 0, col: 0 },
  a: { hand: 'left', finger: 0, row: 1, col: 0 },
  z: { hand: 'left', finger: 0, row: 2, col: 0 },
  w: { hand: 'left', finger: 1, row: 0, col: 0 },
  s: { hand: 'left', finger: 1, row: 1, col: 0 },
  x: { hand: 'left', finger: 1, row: 2, col: 0 },
  e: { hand: 'left', finger: 2, row: 0, col: 0 },
  d: { hand: 'left', finger: 2, row: 1, col: 0 },
  c: { hand: 'left', finger: 2, row: 2, col: 0 },
  r: { hand: 'left', finger: 3, row: 0, col: 0 },
  f: { hand: 'left', finger: 3, row: 1, col: 0 },
  v: { hand: 'left', finger: 3, row: 2, col: 0 },
  t: { hand: 'left', finger: 3, row: 0, col: 1 },
  g: { hand: 'left', finger: 3, row: 1, col: 1 },
  b: { hand: 'left', finger: 3, row: 2, col: 1 },
  y: { hand: 'right', finger: 3, row: 0, col: 1 },
  h: { hand: 'right', finger: 3, row: 1, col: 1 },
  n: { hand: 'right', finger: 3, row: 2, col: 1 },
  u: { hand: 'right', finger: 3, row: 0, col: 0 },
  j: { hand: 'right', finger: 3, row: 1, col: 0 },
  m: { hand: 'right', finger: 3, row: 2, col: 0 },
  i: { hand: 'right', finger: 2, row: 0, col: 0 },
  k: { hand: 'right', finger: 2, row: 1, col: 0 },
  o: { hand: 'right', finger: 1, row: 0, col: 0 },
  l: { hand: 'right', finger: 1, row: 1, col: 0 },
  p: { hand: 'right', finger: 0, row: 0, col: 0 },
}

function computeSpeedEquivalent(k1: string, k2: string): number {
  if (k1 === k2) return 1.0

  const i1 = KEY_MAP[k1]
  const i2 = KEY_MAP[k2]
  if (!i1 || !i2) return 1.5

  const rowDist = Math.abs(i1.row - i2.row)
  const sameHand = i1.hand === i2.hand
  const sameFinger = sameHand && i1.finger === i2.finger

  if (sameFinger) {
    let base = 1.2 + rowDist * 0.15
    if (i1.col !== i2.col) base += 0.1
    if (i1.finger === 0) base += 0.15
    if (i1.finger === 0 && rowDist === 2) base += 0.1
    return Math.round(base * 100) / 100
  }

  if (sameHand) {
    const fingerDist = Math.abs(i1.finger - i2.finger)
    let base = 0.95 + fingerDist * 0.08 + rowDist * 0.12
    if (i1.row === 2 || i2.row === 2) base += 0.05
    return Math.round(base * 100) / 100
  }

  let base = 0.9
  if (i1.row !== 1) base += 0.05
  if (i2.row !== 1) base += 0.05
  if (i1.row === 2) base += 0.05
  if (i2.row === 2) base += 0.05
  if (i1.finger === 0 && i2.finger === 0) base += 0.6
  else if (i1.finger === 0 || i2.finger === 0) base += 0.08
  return Math.round(base * 100) / 100
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

function buildTable(): Record<string, number> {
  const table: Record<string, number> = {}
  for (const a of LETTERS) {
    for (const b of LETTERS) {
      table[a + b] = computeSpeedEquivalent(a, b)
    }
  }
  return table
}

export const speedEquivalentTable: Record<string, number> = buildTable()

export function getSpeedEquivalent(key1: string, key2: string): number {
  const k1 = key1.toLowerCase()
  const k2 = key2.toLowerCase()
  return speedEquivalentTable[k1 + k2] ?? computeSpeedEquivalent(k1, k2)
}

const SPACE_KEY = ' '

export function calcWeightedSpeedEquivalent(
  entries: Array<{ char: string; code: string }>,
  charFrequency: Record<string, number>,
  fullLen: number = 4
): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const entry of entries) {
    const freq = charFrequency[entry.char] || 0
    if (freq === 0) continue

    let code = entry.code.toLowerCase()
    if (code.length < fullLen && !code.endsWith('_')) {
      code = code + '_'
    }

    const keys = code.split('')
    if (keys.length < 2) continue

    for (let i = 0; i < keys.length - 1; i++) {
      const k1 = keys[i] === '_' ? SPACE_KEY : keys[i]
      const k2 = keys[i + 1] === '_' ? SPACE_KEY : keys[i + 1]
      let eq: number
      if (k1 === SPACE_KEY || k2 === SPACE_KEY) {
        eq = 1.1
      } else {
        eq = getSpeedEquivalent(k1, k2)
      }
      weightedSum += eq * freq
      totalWeight += freq
    }
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10000) / 10000 : 0
}
