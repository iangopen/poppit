# Music

Drop your songs (mp3 or ogg) in this folder and list them in `tracks.json`:

```json
[
  { "src": "song-one.mp3", "title": "Song One" },
  "song-two.mp3"
]
```

The game shuffles them (every song once per round, never the same one twice in a row), crossfades between them, and
starts on the player's first tap. Players can switch it off or change the volume in Settings.
Tip: aim for about 96-128 kbps mp3 and similar loudness across songs.
