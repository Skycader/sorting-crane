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

- `get(index)` — scan/read (laser, no lift)
- `grab(position)` — pick onto electromagnet stack (max 2)
- `put(position)` — place **last grabbed** container (LIFO)
- `getLength()` / `snapshot`
- Counters: `reads`, `grabs`, `puts`, `outOfRange`

Swap example:

```js
api.grab(i);
api.grab(j);
api.put(i); // releases j's container first
api.put(j);
```
