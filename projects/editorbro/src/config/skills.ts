// The 64 skills of the studio (docs/factcheck.md F3; the repo's docs/03-skills-map.md). Real names, counted 30 Oct 2026.
export const SKILLS: { name: string; pack: 'ours' | 'maxx' | 'hf' | 'ak' | 'hyper' | 'pack' }[] = [
  ...['reel-pipeline', 'motion-studio'].map((name) => ({ name, pack: 'ours' as const })),
  { name: 'motionmaxxing', pack: 'maxx' },
  ...['higgsfield-generate', 'higgsfield-brandkit', 'higgsfield-marketplace-cards', 'higgsfield-product-photoshoot', 'higgsfield-soul-id',
    'higgsfield-video-explainer', 'higgsfield-websites', 'higgsfield-youtube-thumbnail'].map((name) => ({ name, pack: 'hf' as const })),
  ...['01-cinematic', '02-3d-cgi', '03-cartoon', '04-comic-to-video', '05-fight-scenes', '06-motion-design-ad', '07-ecommerce-ad', '08-anime-action',
    '09-product-360', '10-music-video', '11-social-hook', '12-brand-story', '13-fashion-lookbook', '14-food-beverage', '15-real-estate',
    'higgsfield-image-auto', 'seedance-auto-generate', 'ugc-hot-girl', 'ugc-video-auto'].map((name) => ({ name, pack: 'ak' as const })),
  ...['hyperframes', 'hyperframes-core', 'hyperframes-animation', 'hyperframes-audio', 'hyperframes-cli', 'hyperframes-creative', 'hyperframes-keyframes',
    'hyperframes-registry', 'hyperframes-studio', 'faceless-explainer', 'general-video', 'media-use', 'motion-graphics', 'music-to-video',
    'product-launch-video', 'pr-to-video', 'remotion-to-hyperframes', 'slideshow', 'talking-head-recut', 'embedded-captions', 'figma'].map((name) => ({ name, pack: 'hyper' as const })),
  ...['animated-chart', 'apple-launch-film', 'brand-intake', 'launch-video', 'loop-cover', 'milestone-reveal', 'model-showdown', 'motion-brief-writer',
    'motion-effects', 'newsletter-promo', 'reel-export', 'title-sequence-3d', 'vox-explainer'].map((name) => ({ name, pack: 'pack' as const })),
];

export const GATES = ['VERIFY', 'BRIEF', 'REFERENCE STUDY', 'STUDIO SETUP', 'VOICE + AUDIO', 'SHOTLIST', 'STYLE BIBLE', 'KEY STILLS', 'ANIMATIC', 'BUILD', 'CRITIQUE', 'FINISH + SHIP'];
