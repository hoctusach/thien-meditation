import json, asyncio, edge_tts
items=json.load(open('affirmations.json'))
async def main():
    for i,it in enumerate(items):
        c=edge_tts.Communicate(it['en'],"en-US-AvaNeural",rate="-15%",pitch="-2Hz")
        await c.save(f"audio/en_{i+1:02d}.mp3")
asyncio.run(main())
