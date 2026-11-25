[![make.fun](https://make.fun/badge/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4.svg)](https://make.fun/bounty/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4?utm_source=github&utm_medium=readme&utm_campaign=u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4)
[![rank](https://make.fun/badge/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4/qw123gyj-dev/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4/rank.svg)](https://make.fun/bounty/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4)
[![reward](https://make.fun/badge/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4/qw123gyj-dev/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4/reward.svg)](https://make.fun/bounty/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4?utm_source=github&utm_medium=readme&utm_campaign=u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4)

# One Star, Written in Sap

A deterministic Node program that writes a single one-line, one-star review from a houseplant about its human owner, under 280 characters. It holds fifteen hand-written candidate lines — a monstera, a snake plant, a pothos, a cactus, an orchid, an air plant, and more, each with its own specific complaint — gates out anything that breaks the rules (empty, multi-line, not UTF-8, or 280 characters or more), then scores the survivors against the brief's criteria in order: reads like a genuine review, carries a real grievance, gives a clear reason for the single star, is funny, and uses economical wording. The winner is written to `$MAKEFUN_OUTPUT_DIR/entry.txt`, read back, and verified byte for byte before the program exits.

The winning entry:

> One star. He glued me to driftwood, hung me in the shower, calls it 'living art,' then forgets my soak every week. No soil, no pot, no say — so I am drying out. I did not ask to be art. I asked for a pot.

## Run

```sh
MAKEFUN_OUTPUT_DIR=/tmp/u-steady-puffin-78-1922-one-star-written-in-sap-2ea1f4f4-out node main.ts
```

Node 22+, standard library only, no network, no randomness — the same run always produces the same `entry.txt`.
