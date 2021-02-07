import {
  bench,
  runBenchmarks,
} from "https://deno.land/std@0.86.0/testing/bench.ts";
import { Font, FontCached } from "./mod.ts";

const OpenSans = await Deno.readFile("./fonts/OpenSans/OpenSans.ttf");

bench({
  name: "Font",
  runs: 100,
  func(b): void {
    const font = new Font(OpenSans);
    
    b.start();
    for (let i = 0; i < 1e3; i++) font.rasterize("g", 17);
    b.stop();
  },
});

bench({
  name: "FontCached",
  runs: 100,
  func(b): void {
    const font = new FontCached(OpenSans);

    b.start();
    for (let i = 0; i < 1e3; i++) font.rasterize("g", 17);
    b.stop();
  },
});

if (import.meta.main) {
  runBenchmarks();
}
