## Tab Play Queue

(that name is temporary)

This is a web extension created for Firefox, currently manifest v2, that lets you use browser tabs as a YouTube play queue.
It's meant to detect when the video in the active tab ends and automatically selects the next tab and start it playing,
and intended to be used when YouTube's own autoplay feature is off.

However there's currently no way to give permissions to a web extension to autoplay videos. Instead an extension's script
has the same restrictions as an untrusted webpage and cause calls to play() on video elements to generate runtime exceptions.

So, until I can figure out what it takes to get this to work, this extension is a work in progress.
