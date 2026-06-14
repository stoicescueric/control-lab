/* Tiny linear-algebra helpers for the Kalman / EKF demos.
   Matrices are arrays-of-arrays (row major); vectors are plain arrays.
   Kept deliberately small and dependency-free. */
(function (global) {
  "use strict";

  function zeros(r, c) {
    const M = new Array(r);
    for (let i = 0; i < r; i++) M[i] = new Array(c).fill(0);
    return M;
  }

  function identity(n) {
    const M = zeros(n, n);
    for (let i = 0; i < n; i++) M[i][i] = 1;
    return M;
  }

  function clone(A) { return A.map((row) => row.slice()); }

  function transpose(A) {
    const r = A.length, c = A[0].length, T = zeros(c, r);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
    return T;
  }

  function mul(A, B) {
    const r = A.length, n = B.length, c = B[0].length;
    const C = zeros(r, c);
    for (let i = 0; i < r; i++) {
      for (let k = 0; k < n; k++) {
        const a = A[i][k];
        if (a === 0) continue;
        const Bk = B[k];
        for (let j = 0; j < c; j++) C[i][j] += a * Bk[j];
      }
    }
    return C;
  }

  function add(A, B) {
    const r = A.length, c = A[0].length, C = zeros(r, c);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) C[i][j] = A[i][j] + B[i][j];
    return C;
  }

  function sub(A, B) {
    const r = A.length, c = A[0].length, C = zeros(r, c);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) C[i][j] = A[i][j] - B[i][j];
    return C;
  }

  function scale(A, s) {
    return A.map((row) => row.map((v) => v * s));
  }

  /* Multiply matrix A (r x n) by column vector v (length n) -> array length r */
  function matVec(A, v) {
    const r = A.length, n = v.length, out = new Array(r).fill(0);
    for (let i = 0; i < r; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) s += A[i][j] * v[j];
      out[i] = s;
    }
    return out;
  }

  /* General square-matrix inverse via Gauss-Jordan elimination. */
  function inv(A) {
    const n = A.length;
    const M = clone(A);
    const I = identity(n);
    for (let col = 0; col < n; col++) {
      // partial pivot
      let piv = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      }
      if (Math.abs(M[piv][col]) < 1e-12) throw new Error("matrix is singular");
      if (piv !== col) { [M[piv], M[col]] = [M[col], M[piv]]; [I[piv], I[col]] = [I[col], I[piv]]; }
      const d = M[col][col];
      for (let j = 0; j < n; j++) { M[col][j] /= d; I[col][j] /= d; }
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = M[r][col];
        if (f === 0) continue;
        for (let j = 0; j < n; j++) { M[r][j] -= f * M[col][j]; I[r][j] -= f * I[col][j]; }
      }
    }
    return I;
  }

  global.LA = { zeros, identity, clone, transpose, mul, add, sub, scale, matVec, inv };
})(typeof window !== "undefined" ? window : globalThis);
