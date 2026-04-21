import subprocess
import sys

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    install('youtube-transcript-api')
    from youtube_transcript_api import YouTubeTranscriptApi

video_ids = ['vC4gDIAxYLA', 'WvxQXIJmXx0', 'x8RZSX3Rycg']

for vid in video_ids:
    print(f"\n==================== VIDEO: {vid} ====================")
    try:
        ts = YouTubeTranscriptApi.get_transcript(vid, languages=['es', 'en', 'es-419'])
        text = " ".join([x['text'] for x in ts])
        print(text)
    except Exception as e:
        print(f"Error fetching transcript for {vid}: {e}")
