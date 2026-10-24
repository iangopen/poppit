# Hall of Ducks report (2026-10-23)

Output of `node tools/sim32.js --ducks`, copied as is. The sim cannot keep pearls, so collection times are each duck's
first-craft cost divided by its type's normal pop rate (manual and helper pops). These are untuned starting points.

```
# Hall of Ducks report (seeded; normal pops per minute over the 300 s before each checkpoint; keeping is not simulated)
Rates are the mean of 4 seeds per profile; the checkpoint minutes are the reference seed's.

casual checkpoints: first helper 11.4 min, first Fresh Batch 12.8 min, C6 Fresh Batch 5.4 min
engaged checkpoints: first helper 4.8 min, first Fresh Batch 6.0 min, C6 Fresh Batch 2.3 min

Pops per minute: casual (helper / first FB / C6), engaged (same)

type                        casual                   engaged
pearl       87.45 / 123.75 / 99.64  108.75 / 118.25 / 124.29
blue            7.20 / 4.90 / 4.92     32.08 / 38.30 / 28.20
mint            4.20 / 4.05 / 3.26      9.54 / 10.65 / 11.88
golden          1.90 / 1.80 / 1.74        5.80 / 7.65 / 5.65
violet          1.85 / 2.80 / 1.34        3.17 / 3.70 / 3.14
coral           0.70 / 1.15 / 0.82        0.59 / 0.95 / 2.35
marble          0.20 / 0.55 / 0.26        0.21 / 0.60 / 0.22
opal            0.15 / 0.25 / 0.10        0.00 / 0.25 / 0.22
ruby            0.00 / 0.15 / 0.16        0.00 / 0.05 / 0.10
black           0.00 / 0.10 / 0.05        0.00 / 0.10 / 0.11

Duck first-craft cost (data) against the suggestion, and minutes to collect it at each checkpoint rate (- = none popped)

duck            data  suggest            casual min           engaged min
Blue Duck       1600     1600       222 / 327 / 325          50 / 42 / 57
Mint Duck        760      760       181 / 188 / 233          80 / 71 / 64
Golden Duck      410      410       216 / 228 / 236          71 / 54 / 73
Violet Duck      300      300       162 / 107 / 223          95 / 81 / 96
Coral Duck       120      120       171 / 104 / 147        204 / 126 / 51
Marble Duck       36       36        180 / 65 / 139        172 / 60 / 167
Opal Duck         22       22        147 / 88 / 220          - / 88 / 102
Ruby Duck         12       12           - / 80 / 76         - / 240 / 126
Black Duck        10       10         - / 100 / 200          - / 100 / 92

Cycle times (min, Fresh Batch taken as soon as ready), C1..C6

no ducks                    casual   12.8 / 12.9 / 10.2 / 8.6 / 6.6 / 5.4   Flavors 19, global payout x 2.9
no ducks                    engaged  6.0 / 3.6 / 3.4 / 3.0 / 2.2 / 2.3   Flavors 19, global payout x 2.9
Pink Duck only (Common)     casual   11.0 / 8.6 / 6.2 / 5.0 / 4.1 / 4.6   Flavors 19, global payout x 4.1
Pink Duck only (Common)     engaged  3.6 / 3.3 / 2.6 / 2.1 / 2.4 / 1.8   Flavors 21, global payout x 4.3
all 10 ducks (Common)       casual   7.1 / 5.6 / 6.4 / 4.3 / 4.4 / 3.3   Flavors 19, global payout x 4.1
all 10 ducks (Common)       engaged  2.9 / 2.6 / 2.1 / 2.3 / 1.6 / 1.6   Flavors 23, global payout x 4.6
```
