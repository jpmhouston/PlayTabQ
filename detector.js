// PlayTabQ
// Copyright © 2025 Pierre Houston, Bananameter Labs. All rights reserved.

// Aattach the necessary event listeners to the page's video element.
function addListeners() {
  const video = document.querySelector('video');
  if (video) {
    addListenersToVideo(video);
  }
}

function addListenersToVideo(videoElement) {
  if (videoElement.dataset.listenersAttached) {
    // Don't attach listeners more than once.
    return;
  }
  console.log("Tab Play Queue found video element, attaching listeners:", videoElement);
  
  // Event listener for when the video finishes playing
  videoElement.addEventListener("ended", () => {
    if (browser.storage.local.get("isEnabled")) {
      console.log("Tab Play Queue detected video has ended, sending VIDEO_ENDED message to its background script.");
      // Send a message to the background script.
      browser.runtime.sendMessage({ type: "VIDEO_ENDED" });
    }
  });
  
  // Add the message listener for the PLAY_VIDEO command
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "PLAY_VIDEO") {
      console.log("Tab Play Queue received PLAY_VIDEO message from its background script.");
      if (videoElement && videoElement.paused) {
        videoElement.play();
      }
    }
  });
  
  // Mark the element so we don't add listeners again.
  videoElement.dataset.listenersAttached = 'true';
}

// Since YouTube is a Single-Page App, the <video> element might not be present
// on initial load. We use a MutationObserver to watch for when it's added to the page.
const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.addedNodes) {
      mutation.addedNodes.forEach(node => {
        // The node itself might be the video, or it might contain it.
        if (node.nodeName === 'VIDEO') {
          addListenersToVideo(node);
        } else if (node.querySelector) {
          const video = node.querySelector('video');
          if (video) {
            addListenersToVideo(video);
          }
        }
      });
    }
  }
});

document.addEventListener('visibilitychange', () => {
  // When the tab becomes visible, try to attach the listeners.
  // This is redundant if they're already attached, but it's safe because
  // addListenersToVideo() checks before adding them again.
  if (document.visibilityState === 'visible') {
    addListeners()
  }
});

// Run the attachment logic immediately when the script is first injected.
// This covers new tabs, reloads, and injection into existing *active* tabs.
addListeners()

// Start the observer to handle in-page navigation (clicking a new video).
observer.observe(document.body, {
  childList: true,
  subtree: true
});
