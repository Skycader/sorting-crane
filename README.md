# CRANE://SORT

Cyberpunk dark-solarized visualizer for array algorithms. A gantry crane (2-container grip) replays `get` / `set` calls from your code.

## Run

```bash
npm install
npm run dev
```

## How to use

1. Set array size / **GENERATE**
2. Write `const f = (api) => { ... }` in the editor
3. **COMPILE & LOAD** — runs your function against an instrumented `Api`
4. Play / step through the crane timeline

### Api

- `get(index)` — scan/read (crane laser, no lift)
- `grab(position)` — pick container into next free claw slot (`#0` then `#1`, max 2)
- `put(position, number)` — place claw slot `#number` (`0`|`1`) into an empty position
- `getLength()` / `snapshot`
- Counters: `reads`, `grabs`, `puts`, `outOfRange`

Swap example:

```js
api.grab(i); // #0
api.grab(j); // #1
api.put(i, 1);
api.put(j, 0);
```
