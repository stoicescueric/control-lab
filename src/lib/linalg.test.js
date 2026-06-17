import {describe, it, expect} from 'vitest';
import {
  zeros,
  identity,
  clone,
  transpose,
  mul,
  add,
  sub,
  scale,
  matVec,
  inv,
} from './linalg.js';

describe('constructors', () => {
  it('zeros builds an r x c matrix of 0s', () => {
    expect(zeros(2, 3)).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it('identity has 1s on the diagonal', () => {
    expect(identity(3)).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it('clone is a deep copy (mutating the copy leaves the original)', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    const B = clone(A);
    B[0][0] = 99;
    expect(A[0][0]).toBe(1);
  });
});

describe('elementwise ops', () => {
  const A = [
    [1, 2],
    [3, 4],
  ];
  const B = [
    [5, 6],
    [7, 8],
  ];

  it('add', () => {
    expect(add(A, B)).toEqual([
      [6, 8],
      [10, 12],
    ]);
  });

  it('sub', () => {
    expect(sub(B, A)).toEqual([
      [4, 4],
      [4, 4],
    ]);
  });

  it('scale', () => {
    expect(scale(A, 2)).toEqual([
      [2, 4],
      [6, 8],
    ]);
  });
});

describe('transpose', () => {
  it('flips a non-square matrix', () => {
    expect(
      transpose([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it('is its own inverse', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(transpose(transpose(A))).toEqual(A);
  });
});

describe('multiplication', () => {
  it('mul of two 2x2 matrices', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    const B = [
      [5, 6],
      [7, 8],
    ];
    expect(mul(A, B)).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });

  it('mul by identity is a no-op', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    expect(mul(A, identity(2))).toEqual(A);
  });

  it('mul respects non-square shapes (2x3 * 3x2 -> 2x2)', () => {
    const A = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const B = [
      [7, 8],
      [9, 10],
      [11, 12],
    ];
    expect(mul(A, B)).toEqual([
      [58, 64],
      [139, 154],
    ]);
  });

  it('matVec multiplies a matrix by a column vector', () => {
    const A = [
      [1, 2],
      [3, 4],
    ];
    expect(matVec(A, [5, 6])).toEqual([17, 39]);
  });
});

describe('inverse', () => {
  it('A * inv(A) = I for a well-conditioned matrix', () => {
    const A = [
      [4, 7],
      [2, 6],
    ];
    const prod = mul(A, inv(A));
    expect(prod[0][0]).toBeCloseTo(1, 10);
    expect(prod[0][1]).toBeCloseTo(0, 10);
    expect(prod[1][0]).toBeCloseTo(0, 10);
    expect(prod[1][1]).toBeCloseTo(1, 10);
  });

  it('inverts a 3x3 (with a row swap needed for pivoting)', () => {
    const A = [
      [0, 1, 4],
      [2, 1, 0],
      [1, 0, 3],
    ];
    const prod = mul(A, inv(A));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(prod[i][j]).toBeCloseTo(i === j ? 1 : 0, 9);
      }
    }
  });

  it('throws on a singular matrix', () => {
    expect(() =>
      inv([
        [1, 2],
        [2, 4],
      ]),
    ).toThrow(/singular/);
  });
});
