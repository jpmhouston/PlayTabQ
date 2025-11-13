// PlayTabQ
// Copyright © 2025 Pierre Houston, Bananameter Labs. All rights reserved.

const toggleEnable = document.getElementById('toggle-enable');
const toggleCloseTabs = document.getElementById('toggle-close-tabs');
const toggleDirection = document.getElementById('toggle-direction');
const YOUTUBE_VIDEO_REGEX = /^https?:\/\/(www\.)?youtube\.com\/watch/;

// This main function runs when the popup is opened
async function initializePopup() {
  // 1. Get the currently active tab
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  const onYouTubeVideoPage = currentTab && YOUTUBE_VIDEO_REGEX.test(currentTab.url);
  
  // 2. Add note if not on a valid page
  if (!onYouTubeVideoPage) {
    const container = document.querySelector('.container');
    const message = document.createElement('div');
    message.textContent = 'This extension is only active on YouTube video pages.';
    message.className = 'disabled-message';
    container.appendChild(message);
  }
  
  // 3. Load settings from storage and set the switch states
  document.body.classList.add('no-transition'); // temp add class to disable transitions
  
  const storage = await browser.storage.local.get(["isEnabled", "closeTabsAutomatically", "rightToLeft"]);
  toggleEnable.checked = storage.isEnabled !== false;
  toggleCloseTabs.checked = storage.closeTabsAutomatically === true;
  toggleDirection.checked = storage.rightToLeft !== true;
  
  // Force a reflow. This is crucial to ensure the browser applies the 'no-transition'
  // style before it renders the 'checked' state. Without this, the browser might
  // optimize and still animate.
  void toggleEnable.offsetHeight; 
  document.body.classList.remove('no-transition'); // remove temp class
}

initializePopup();

// Save state when 'Enable' toggle changes
toggleEnable.addEventListener('change', () => {
  browser.storage.local.set({ isEnabled: toggleEnable.checked });
});

// Save state when 'Close tabs automatically' toggle changes
toggleCloseTabs.addEventListener('change', () => {
  browser.storage.local.set({ closeTabsAutomatically: toggleCloseTabs.checked });
});

// Save state when 'Right to left' toggle changes
toggleDirection.addEventListener('change', () => {
  browser.storage.local.set({ rightToLeft: ! toggleDirection.checked });
});
