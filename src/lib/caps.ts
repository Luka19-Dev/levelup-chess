// Georgian capitals (Mtavruli) for buttons and titles. Do NOT also add CSS
// `text-transform: uppercase`: on a lang="ka" page Chrome then draws Mtavruli
// back as ordinary letters. String.toUpperCase maps ა -> Ა and Latin a -> A.
export const caps = (s: string) => s.toUpperCase()
