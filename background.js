// PlayTabQ
// Copyright 2025 Bananameter Labs

const icons = {
  enabled: "toolbaricon-on-32.png",
  disabled: "toolbaricon-off-32.png"
};

// A simple regex to identify YouTube video pages
const YOUTUBE_VIDEO_REGEX = /^https?:\/\/(www\.)?youtube\.com\/watch/;

// This function is now the central controller for the icon's state
async function updateIconState(tab) {
  // A tab object might not have a URL (e.g., about:newtab)
  if (!tab || !tab.url) {
    browser.browserAction.setIcon({ path: icons.disabled });
    return;
  }
  
  const onYouTubeVideoPage = YOUTUBE_VIDEO_REGEX.test(tab.url);
  const storage = await browser.storage.local.get("isEnabled");
  
  // The icon should only be enabled if BOTH conditions are true
  if (onYouTubeVideoPage && storage.isEnabled !== false) {
    browser.browserAction.setIcon({ path: icons.enabled });
  } else {
    browser.browserAction.setIcon({ path: icons.disabled });
  }
}

async function videoEndedInTab(currentTab) {
  // Do nothing if enabled switch is off.
  const storage = await browser.storage.local.get(["isEnabled", "rightToLeft", "closeTabsAutomatically"]);
  if (storage.isEnabled !== true) {
    return
  }
  
  // Verify currentTab is still its window's active tab.
  const activeTabs = await browser.tabs.query({ active: true, windowId: currentTab.windowId });
  const activeTab = activeTabs[0];
  if (!activeTab || activeTab.id !== currentTab.id) {
    console.log("User switched tabs before video ended action could complete. Aborting auto-switch.");
    return;
  }
  
  // Get all tabs in the window, index of currentTab.
  const tabs = await browser.tabs.query({ windowId: currentTab.windowId });
  const currentIndex = tabs.findIndex(tab => tab.id === currentTab.id);
  
  // Calculate the index of the tab to the right or left.
  let nextTabIndex = currentIndex;
  if (nextTabIndex !== -1) {
    if (storage.rightToLeft === true) {
      nextTabIndex--;
      if (nextTabIndex < 0) nextTabIndex = -1;
    } else {
      nextTabIndex++;
      if (nextTabIndex >= tabs.length) nextTabIndex = -1;
    }
  }
  
  // Get the next tab and make it active, is video tell it to play.
  if (nextTabIndex !== -1) {
    const nextTab = tabs[nextTabIndex];
    if (nextTab) {
      await browser.tabs.update(nextTab.id, { active: true });
      
      if (YOUTUBE_VIDEO_REGEX.test(nextTab.url)) {
        if (tab.status === "complete") {
          tellTabToPlay(nextTab);
        } else {
          tellTabToPlayOnceItLoads(nextTab);
        }
      }
    }
  }
  
  // Optionally close the previous tab.
  if (storage.closeTabsAutomatically === true) {
    await browser.tabs.remove(currentTab.id);
  }
}

function tellTabToPlay(tab) {
  //console.log("Tab ${tab.id} is complete, sending PLAY_VIDEO message.");
  //browser.tabs.sendMessage(tab.id, { type: "PLAY_VIDEO" }).catch(error => {
  //  console.error(`Could not send PLAY_VIDEO message to tab ${tab.id}: ${error.message}`);
  //});
  
  //console.log("In tab ${tab.id} inserting script to play its video element.");
  // Inject & run script in the target tab that finds a video element and calls play().
  browser.tabs.executeScript(tab.id, {
    code: `
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.play().catch(error => {
          console.error("play() failed within tellTabToPlay:", error.message);
        });
      }
    `
  }).catch(error => {
    console.error(`Failed to execute script in tab ${tab.id}:`, error.message);
  });
}

function tellTabToPlayOnceItLoads(tab) {
  //console.log("Tab ${tab.id} is still loading, waiting for it to complete...");
  const pageLoadListener = (tabId, changeInfo) => {
    // Make sure this update is for the correct tab and it has finished loading.
    if (tabId === tab.id && changeInfo.status === "complete") {
      //console.log(`Tab ${tabId} has completed loading, calling tellTabToPlay().`);
      tellTabToPlay(tab)
      
      // IMPORTANT: Remove this listener so it only runs once for this tab.
      browser.tabs.onUpdated.removeListener(pageLoadListener);
    }
  };
  
  // Add the temporary listender.
  browser.tabs.onUpdated.addListener(pageLoadListener);
}

// --- Event Listeners ---

browser.browserAction.onClicked.addListener((tab, onClickData) => {
  console.log("Toolbar icon clicked on tab:", tab.id);
  console.log("Modifier keys held:", onClickData.modifiers); // This is an array, e.g., ["Shift"]

  // Toggle on-off when a Ctrl-click (or Command on Mac) detected
  if (onClickData.modifiers.includes("Ctrl") || onClickData.modifiers.includes("Command")) {
    console.log("Ctrl/Command-click detected! Performing another action.");
    browser.storage.local.get("isEnabled").then(result => {
      const newState = !(result.isEnabled !== false);
      browser.storage.local.set({ isEnabled: newState });
      // The existing storage listener will handle the icon update automatically.
    });
    return;
  }

  // Open the popup menu when its a normal click (no modifiers)
  console.log("Normal click detected! Performing default action.");
  browser.browserAction.setPopup({
    popup: "popup.html"
  });
  browser.browserAction.openPopup().then(() => {
    // After the popup is opened and eventually closed by the user,
    // we can clear the popup setting so onClicked will fire again next time.
    browser.browserAction.setPopup({ popup: null });
  }).catch(error => {
    console.error("Failed to open popup:", error);
    browser.browserAction.setPopup({ popup: null }); // also on failure as above.
  });
});

// When the video ends in the current tab
browser.runtime.onMessage.addListener((message, sender) => {
  // Check if the message is the one we're expecting
  if (message.type === "VIDEO_ENDED") {
    videoEndedInTab(sender.tab);
  }
});

// When the user switches to a different tab
browser.tabs.onActivated.addListener(activeInfo => {
  browser.tabs.get(activeInfo.tabId).then(updateIconState);
});

// When the user navigates to a new URL in a tab
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // onUpdated fires multiple times; we only care about URL changes
  if (changeInfo.url) {
    updateIconState(tab);
  }
});

// When the user toggles the 'isEnabled' switch in the popup
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.isEnabled) {
    // Re-evaluate the icon state for the currently active tab
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        updateIconState(tabs[0]);
      }
    });
  }
});

// Set the initial icon state when the browser first starts
browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
  if (tabs[0]) {
    updateIconState(tabs[0]);
  }
});
