# iOS device viewport table

**Last checked: 2026-09-04.** iPhone 18 is unannounced (Apple event expected
2026-09-09); re-check after any hardware announcement. Primary source:
ios-resolution.com.

Sizes are **CSS points**, portrait. Pixel dimensions = points × DPR. Landscape
media queries swap width and height.

## iPhone

| Points    | DPR | Devices                                  |
| :-------- | :-- | :--------------------------------------- |
| 320 × 568 | 2   | SE (1st gen), 5/5s/5c                    |
| 375 × 667 | 2   | 6s, 7, 8, SE 2, SE 3                     |
| 414 × 736 | 3   | 6s Plus, 7 Plus, 8 Plus                  |
| 375 × 812 | 3   | X, XS, 11 Pro, 12 mini, 13 mini          |
| 414 × 896 | 2   | XR, 11                                   |
| 414 × 896 | 3   | XS Max, 11 Pro Max                       |
| 390 × 844 | 3   | 12, 12 Pro, 13, 13 Pro, 14, 16e, 17e     |
| 428 × 926 | 3   | 12 Pro Max, 13 Pro Max, 14 Plus          |
| 393 × 852 | 3   | 14 Pro, 15, 15 Pro, 16                   |
| 430 × 932 | 3   | 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus |
| 402 × 874 | 3   | 16 Pro, 17, 17 Pro                       |
| 440 × 956 | 3   | 16 Pro Max, 17 Pro Max                   |
| 420 × 912 | 3   | iPhone Air                               |

## iPad

| Points      | DPR | Devices                                              |
| :---------- | :-- | :--------------------------------------------------- |
| 768 × 1024  | 2   | iPad 3–6, iPad mini 2–5, iPad Air 1–2, iPad Pro 9.7" |
| 810 × 1080  | 2   | iPad 7, 8, 9                                         |
| 820 × 1180  | 2   | iPad 10, iPad 11, iPad Air 4–8 (11")                 |
| 744 × 1133  | 2   | iPad mini 6, mini 7                                  |
| 834 × 1112  | 2   | iPad Pro 10.5", iPad Air 3                           |
| 834 × 1194  | 2   | iPad Pro 11" gen 1–4 (2018–2022)                     |
| 834 × 1210  | 2   | iPad Pro 11" gen 5–6 (M4, M5)                        |
| 1024 × 1366 | 2   | iPad Pro 12.9" (all gens), iPad Air 13"              |
| 1032 × 1376 | 2   | iPad Pro 13" (M4, M5)                                |

## Unique triples

These are the values that actually matter — one startup image per triple, per
orientation. 22 triples × 2 orientations = 44 images.

```text
320x568@2   375x667@2   414x736@3   375x812@3
414x896@2   414x896@3   390x844@3   428x926@3
393x852@3   430x932@3   402x874@3   440x956@3
420x912@3
768x1024@2  810x1080@2  820x1180@2  744x1133@2
834x1112@2  834x1194@2  834x1210@2  1024x1366@2  1032x1376@2
```

Note `414 × 896` appears at both DPR 2 and DPR 3 — the DPR is part of the key,
not a decoration.

## Maintenance

1. After each Apple hardware announcement, check ios-resolution.com for new
   point sizes (most new models reuse an existing triple; only occasionally is
   a genuinely new one introduced).
2. Add the row, add the alias names, regenerate, bump the splash cache-bust
   version.
3. Deduplicate by triple before emitting `<link>` elements — see
   [splash-screens.md](splash-screens.md).
4. Removing a row breaks splash for that device silently. Prefer keeping old
   rows; the cost is two more images each.
