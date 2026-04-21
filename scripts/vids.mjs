import { YoutubeTranscript } from 'youtube-transcript';

async function fetchTranscript(videoId) {
    console.log(`\n--- Transcript for ${videoId} ---`);
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' });
        const text = transcript.map(t => t.text).join(' ');
        console.log(text.substring(0, 3000));
    } catch (e) {
        console.error(e.message);
    }
}

async function main() {
    await fetchTranscript('vC4gDIAxYLA');
    await fetchTranscript('WvxQXIJmXx0');
    await fetchTranscript('x8RZSX3Rycg');
}

main();
