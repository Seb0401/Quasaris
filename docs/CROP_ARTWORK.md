# Crop artwork

21 transparent botanical illustrations generated with the built-in image generation tool, then resized and encoded as 256px WebP for the app. Final files: `public/images/crops/<cropId>.webp`. The original PNGs remain in the tool's generated-images directory.

The same assets appear in the visual crop picker, groupings, onboarding, comparison cards, calendar and farm palette. Images are decorative beside visible crop names. The picker provides bilingual accent-insensitive search, category filters, native modal keyboard behavior and the existing orchard restrictions. Visited artwork is cached by the service worker for offline use.

## Prompt set

For the 20 crops below, substitute each subject into this exact template:

```text
Use case: stylized-concept. Asset type: an individual transparent crop-selection illustration for the Quasaris farming app used by Majes farmers in Peru. Subject: <SUBJECT> Style: premium friendly hand-painted botanical product illustration, softly dimensional realistic forms, gentle watercolor surface texture, natural saturated colors, subtle ambient shading. Composition: a single compact isolated cluster centered on square canvas, occupies 78 percent, generous even transparent margins, front three-quarter view, all parts completely visible. Soft daylight from upper left. Must be instantly recognizable at 72 pixels and consistent with a warm agricultural illustration collection. Transparent background, preserve clean alpha. No scene, soil bed, ground plane, frame, container, text, labels, lettering, watermark, faces, decorative symbols or extra crops. Individual app asset, not a mockup or sprite sheet.
```

- **papa**: POTATO: three earthy golden-brown potato tubers, one cut to reveal pale yellow flesh, a small leafy potato sprig behind. No onion or carrots.
- **alfalfa**: ALFALFA FORAGE: a compact upright bunch of fresh alfalfa stems with many unmistakable small trifoliate rounded leaves and several small purple clustered alfalfa flowers. No clover globes, no grass ears.
- **maiz_chala**: FORAGE MAIZE: a miniature leafy green maize plant with its tassel, and one yellow corn cob partly exposed in green husk alongside, clearly representing chopped-forage maize rather than popcorn. Full compact plant, not an agricultural scene.
- **haba**: FABA BEAN: two thick broad green fava pods, one open showing three large light green broad beans, one loose large broad bean, a few broad leaves behind. No peas or narrow green beans.
- **frijol**: DRY BEAN: a dry pale tan bean pod split to expose red-brown kidney beans and several loose red-brown kidney beans in front, a small trifoliate leaf behind. No green peas.
- **quinua**: QUINOA: two dense feathery burgundy-red and gold quinoa seed panicles with small pale quinoa grains at their base and characteristic green triangular leaves. No wheat ears, no corn.
- **ajo**: GARLIC: a whole white garlic bulb with papery skin and two separate garlic cloves, one peeled, with short green shoots behind. No onion.
- **zanahoria**: CARROT: two vivid orange carrots with their fresh feathery green tops, one cut round slice showing orange core, compact diagonal cluster. No other vegetables.
- **arveja**: GREEN PEA: fresh green pea pods, one open showing a neat row of small round bright green peas, two loose peas and a delicate curled pea tendril. No broad fava beans.
- **trigo**: WHEAT: a compact tied natural sheaf of three golden ripe wheat ears, plump close-packed grains and relatively short awns, a few golden wheat kernels below. Distinct from long-awn barley.
- **cebada**: BARLEY: a compact sheaf of three golden barley ears with very long fine whiskery awns fanning outward, a few barley kernels at base. Clearly longer awns than wheat, no oats.
- **avena**: FORAGE OATS: a fresh green bunch of oat stems with open branching drooping oat panicles and separate hanging spikelets, partly pale green/gold, leafy green forage at base. No compact wheat spikes.
- **zapallo**: ZAPALLO SQUASH: one squat ribbed green-gray Peruvian squash with a wedge removed showing vivid orange flesh and cream seeds, one small broad vine leaf. No Halloween face.
- **tomate**: TOMATO: two ripe red tomatoes with green star-shaped calyxes and a sliced tomato showing juicy red chambers, small tomato leaf behind. No peppers.
- **paprika**: PAPRIKA PEPPER: three long tapered ripe deep red paprika peppers with green curved stems, one split pepper with pale seeds, a few natural red dried flakes below. No bell pepper, no hot chili flames.
- **alcachofa**: ARTICHOKE: a large fresh green artichoke head with overlapping pointed fleshy bracts, one half artichoke showing its pale heart, a small gray-green serrated leaf. No purple open thistle flower.
- **palta**: AVOCADO: one whole dark pebbled Hass avocado and one half avocado revealing creamy yellow-green flesh and a large warm brown pit, one glossy green leaf behind.
- **uva**: TABLE GRAPE: one hanging compact bunch of plump purple-red table grapes with natural matte bloom, a small green grape leaf and curling vine tendril. No wine bottle.
- **mandarina**: MANDARIN: one small bright orange slightly flattened mandarin with two glossy green leaves and one partly peeled mandarin showing distinct juicy orange segments. No large grapefruit.
- **granada**: POMEGRANATE: one ripe crimson pomegranate with its distinctive crown-shaped calyx, one half exposing ruby-red arils, several loose red arils and a small green leaf.

The first asset, `cebolla`, established the collection's style with this prompt:

```text
Use case: stylized-concept. Asset type: a single transparent crop-selection illustration for the Quasaris farming app used by farmers in Majes, Peru. Subject: an unmistakable ripe purple-red ONION, one whole onion with papery red-purple skin, fresh long green hollow leaves behind it, and one smaller half onion showing pale concentric rings. Style: premium friendly hand-painted 3D botanical illustration, soft clay-like forms with gentle watercolor texture, realistic botanical identity, natural saturated colors, subtle ambient shading. Composition: single compact cluster centered, fills 78 percent of a square canvas, generous even transparent margins, frontal three-quarter view, entire subject visible. Lighting: soft daylight upper left. Transparent background with no ground plane, no rectangular background, no scene, no frame, no text, no letters, no labels, no watermark, no faces, no containers. The silhouette must be instantly understandable at 72 pixels. This is an individual app asset, not a mockup or a sprite sheet.
```
