# Illustrative transformation images — generation guide

Slot 01 holds real photographs. Slots 02 and 03 are not used by the current page; the prompts below remain for future illustrative images if needed.

| Slot | Before | After | Ratio |
|------|--------|-------|-------|
| 01 — Male, 30 days   | `tf-01-before.jpg` + `.webp` | `tf-01-after.jpg` + `.webp` | 4:5 (e.g. 1200×1500) |
| 02 — Female, 60 days | `tf-02-before.jpg` + `.webp` | `tf-02-after.jpg` + `.webp` | 4:5 |
| 03 — Male, 90 days   | `tf-03-before.jpg` + `.webp` | `tf-03-after.jpg` + `.webp` | 4:5 |

The site already labels these as **illustrative, AI-generated, not real clients**.
Keep it that way until real, consented client photos exist.

Tips for consistency between BEFORE and AFTER: generate the BEFORE first, then
use it as an image reference (image-to-image / edit mode) with low strength so
the face, hair, clothing, camera angle and environment stay identical.

## Shared style block (append to every prompt)
> Photorealistic fitness photography, natural gym lighting, 50mm lens, eye-level, 4:5 portrait crop, realistic skin texture with natural imperfections, no retouching, muted colour grade, no text, no watermark, no logos. Not an extreme transformation.

## 01 — Adult male, 30 days
**Before:** Fictional adult man, early 30s, standing relaxed in a quiet modern gym, plain dark t-shirt and shorts, slightly higher body fat, soft midsection, limited muscle definition, natural posture, neutral expression.
**After (same person, same face, same hairstyle, same clothing, same angle, same gym):** Slightly lower body fat, slightly better muscle definition in arms and shoulders, improved upright posture, same neutral expression. Subtle, realistic 30-day change.

## 02 — Adult female, 60 days
**Before:** Fictional adult woman, late 20s, standing in a quiet modern gym, plain sports top and leggings, normal untrained physique, moderate body fat, natural proportions, relaxed posture, neutral expression.
**After (same person, face, hairstyle, outfit, angle, gym):** Noticeably improved definition in shoulders, arms and waist, slightly improved body composition, confident posture. Natural, realistic 60-day progress.

## 03 — Adult male, 90 days
**Before:** Fictional adult man, mid 20s, beginner physique, moderate body fat, limited muscle definition, standing in a quiet modern gym, plain t-shirt and shorts, natural posture.
**After (same person, same identity, same environment, same angle):** Noticeably improved body composition, increased muscle definition in chest, shoulders and arms, more athletic appearance, still completely realistic for 90 days of consistent training.

## Export
Export each image at 1200×1500 as JPEG (quality ~80) and WebP (quality ~78).
From the `thebetterself` folder you can convert with Pillow:

```bash
python3 -c "from PIL import Image; import glob; [Image.open(f).convert('RGB').save(f[:-4]+'.webp','WEBP',quality=78,method=6) for f in glob.glob('assets/img/transformations/tf-*.jpg')]"
```
