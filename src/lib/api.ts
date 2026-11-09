export type ApiEvent =
  | { kind: 'get'; index: number; value: unknown }
  | { kind: 'grab'; index: number; value: unknown; hand: 0 | 1 }
  | { kind: 'put'; index: number; value: unknown; hand: 0 | 1 };

export class Api {
  #arr: (unknown | undefined)[];
  #hands: [unknown | undefined, unknown | undefined] = [undefined, undefined];
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

  /**
   * Pick up the container at position into a free claw slot (max 2).
   * Returns the grabbed value.
   */
  grab(position: number) {
    this.grabs++;
    if (!this.#inRange(position)) {
      this.outOfRange++;
      throw new Error(`grab(${position}): out of range`);
    }
    if (this.#arr[position] === undefined) {
      throw new Error(`grab(${position}): slot is empty`);
    }
    const hand = this.#freeHand();
    if (hand === null) {
      throw new Error('grab: claw already holds 2 containers');
    }
    const value = this.#arr[position];
    this.#arr[position] = undefined;
    this.#hands[hand] = value;
    this.events.push({ kind: 'grab', index: position, value, hand });
    return value;
  }

  /**
   * Place held container #number into position.
   * `number` is the claw slot: 0 or 1.
   */
  put(position: number, number: number) {
    this.puts++;
    if (!this.#inRange(position)) {
      this.outOfRange++;
      throw new Error(`put(${position}, ${number}): out of range`);
    }
    if (number !== 0 && number !== 1) {
      throw new Error(`put: container # must be 0 or 1, got ${number}`);
    }
    const hand = number as 0 | 1;
    if (this.#hands[hand] === undefined) {
      throw new Error(`put: claw slot #${hand} is empty`);
    }
    if (this.#arr[position] !== undefined) {
      throw new Error(`put(${position}): slot is occupied — grab it first`);
    }
    const value = this.#hands[hand];
    this.#hands[hand] = undefined;
    this.#arr[position] = value;
    this.events.push({ kind: 'put', index: position, value, hand });
  }

  getLength() {
    return this.#arr.length;
  }

  get snapshot() {
    return this.#arr.map((v) => (v === undefined ? null : v));
  }

  get hands() {
    return [...this.#hands] as [unknown | undefined, unknown | undefined];
  }

  #inRange(index: number) {
    return Number.isInteger(index) && index >= 0 && index < this.#arr.length;
  }

  #freeHand(): 0 | 1 | null {
    if (this.#hands[0] === undefined) return 0;
    if (this.#hands[1] === undefined) return 1;
    return null;
  }
}
