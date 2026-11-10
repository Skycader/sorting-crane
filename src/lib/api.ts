export type ApiEvent =
  | { kind: 'get'; index: number; value: unknown }
  | { kind: 'grab'; index: number; value: unknown; depth: number }
  | { kind: 'put'; index: number; value: unknown; depth: number };

/**
 * Physical stack on the electromagnet (max 2).
 * grab pushes; put pops (LIFO) — last grabbed is released first.
 */
export class Api {
  #arr: (unknown | undefined)[];
  #stack: unknown[] = [];
  readonly events: ApiEvent[] = [];
  reads = 0;
  grabs = 0;
  puts = 0;
  outOfRange = 0;

  constructor(arr: unknown[]) {
    this.#arr = [...arr];
  }

  get(index: number) {
    this.reads++;
    if (!this.#inRange(index)) {
      this.outOfRange++;
      return undefined;
    }
    const value = this.#arr[index];
    this.events.push({ kind: 'get', index, value });
    return value;
  }

  /** Pick up container at position onto the magnet stack (max 2). */
  grab(position: number) {
    this.grabs++;
    if (!this.#inRange(position)) {
      this.outOfRange++;
      throw new Error(`grab(${position}): out of range`);
    }
    if (this.#arr[position] === undefined) {
      throw new Error(`grab(${position}): slot is empty`);
    }
    if (this.#stack.length >= 2) {
      throw new Error('grab: magnet already holds 2 containers');
    }
    const value = this.#arr[position];
    this.#arr[position] = undefined;
    this.#stack.push(value);
    this.events.push({
      kind: 'grab',
      index: position,
      value,
      depth: this.#stack.length,
    });
    return value;
  }

  /** Place the last grabbed container into an empty position (LIFO). */
  put(position: number) {
    this.puts++;
    if (!this.#inRange(position)) {
      this.outOfRange++;
      throw new Error(`put(${position}): out of range`);
    }
    if (this.#stack.length === 0) {
      throw new Error('put: magnet holds nothing');
    }
    if (this.#arr[position] !== undefined) {
      throw new Error(`put(${position}): slot is occupied — grab it first`);
    }
    const value = this.#stack.pop()!;
    this.#arr[position] = value;
    this.events.push({
      kind: 'put',
      index: position,
      value,
      depth: this.#stack.length + 1,
    });
  }

  getLength() {
    return this.#arr.length;
  }

  get snapshot() {
    return this.#arr.map((v) => (v === undefined ? null : v));
  }

  get stack() {
    return [...this.#stack];
  }

  #inRange(index: number) {
    return Number.isInteger(index) && index >= 0 && index < this.#arr.length;
  }
}
