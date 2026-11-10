import { Api } from './api';

export type RunResult = {
  api: Api;
  error: string | null;
  returnValue: unknown;
};

export function runUserCode(code: string, arr: unknown[]): RunResult {
  const api = new Api(arr);
  try {
    const wrapped = `
      "use strict";
      ${code}
      if (typeof f !== "function") {
        throw new Error("Define function f(api) { ... }");
      }
      return f(api);
    `;
    const runner = new Function('api', wrapped);
    const returnValue = runner(api);
    return { api, error: null, returnValue };
  } catch (e) {
    return {
      api,
      error: e instanceof Error ? e.message : String(e),
      returnValue: null,
    };
  }
}

export function randomArray(size: number, max = 99): number[] {
  const n = Math.max(2, Math.min(30, Math.floor(size)));
  return Array.from({ length: n }, () => Math.floor(Math.random() * max) + 1);
}

export const DEFAULT_CODE = `const f = (api) => {
  const length = api.getLength();

  for (let sorted = 0; sorted < length - 1; sorted++) {
    let min = sorted;
    let minValue = api.get(min);

    for (let i = sorted + 1; i < length; i++) {
      const current = api.get(i);
      if (current < minValue) {
        min = i;
        minValue = current;
      }
    }

    if (min !== sorted) {
      // LIFO magnet stack: last grab is put first
      api.grab(sorted);
      api.grab(min);
      api.put(sorted); // releases min's container
      api.put(min);    // releases sorted's container
    }
  }

  return 0;
};`;
