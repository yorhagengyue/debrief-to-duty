import { loadSources, sentencesFor } from "./sources.ts";
const want = process.argv[2];
for (const s of loadSources().filter((x) => !want || x.id === want)) for (const x of sentencesFor(s)) console.log(`${x.id}\t${x.text}`);
