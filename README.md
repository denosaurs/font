# Font

This is a simple deno module providing wasm bindings to the [fontdue](https://github.com/mooman219/fontdue)
for font rasterization and layout with support for TrueType (`.ttf/.ttc`) and OpenType (`.otf`).

## Prerequisites

| prerequisite                                            | installation                                             |
| ------------------------------------------------------- | -------------------------------------------------------- |
| [deno](https://deno.land/)                              | [deno_install](https://github.com/denoland/deno_install) |
| [rust](https://www.rust-lang.org/)                      | [rustup](https://www.rust-lang.org/tools/install)        |
| [rustfmt](https://github.com/rust-lang/rustfmt)         | `rustup component add rustfmt`                           |
| [rust-clippy](https://github.com/rust-lang/rust-clippy) | `rustup component add clippy`                            |
| [wasm-pack](https://rustwasm.github.io/wasm-pack/)      | `cargo install wasm-pack`                                |

## Development

### build

```bash
$ deno run --unstable --allow-read --allow-write --allow-run scripts/build.ts
building rust                  ("wasm-pack build --target web --release")
read wasm                      (size: 150856 bytes)
compressed wasm using lz4      (reduction: 58651 bytes, size: 92205 bytes)
encoded wasm using base64      (increase: 30735 bytes, size: 122940 bytes)
read js                        (size: 5895 bytes)
inlined js and wasm            (size: 129016 bytes)
minified js                    (size reduction: 3100 bytes, size: 125916 bytes)
writing output to file         (wasm.js)
final size is: 125916 bytes
```

### clean

```bash
$ deno run --unstable --allow-read --allow-write --allow-run scripts/clean.ts
cleaning cargo build           ("cargo clean")
removing pkg
```

### fmt

```bash
$ deno run --unstable --allow-run scripts/fmt.ts
formatting typescript          ("deno --unstable fmt scripts/ test_deps.ts test.ts mod.ts")
Checked 9 files
formatting rust                ("cargo fmt")
```

### lint

```bash
$ deno run --unstable --allow-run scripts/lint.ts
linting typescript             ("deno --unstable lint scripts test_deps.ts test.ts mod.ts")
Checked 9 files
linting rust                   ("cargo clippy -q")
```

## Testing

Requires the `wasm.js` file to be [built](#build) first.

```bash
$ deno test
running 1 tests
test add ... ok (2ms)

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out (2ms)
```

## Other

### Contribution

Pull request, issues and feedback are very welcome. Code style is formatted with `deno fmt` and commit messages are done following [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) spec.

### Licence

Copyright 2020, Denosaurs. All rights reserved. MIT license.
