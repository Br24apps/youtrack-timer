
// Callback function to execute when mutations are observed
const issuePageShown = (mutationList, observer) => {
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      const issueContainer = document.querySelector("[class^=ticketContent__]:not(.tracker-button-initialized)");
      if (issueContainer !== null) {
        issueContainer.classList.add('tracker-button-initialized');
        addButtonToToolbar(issueContainer);
      }
    }
  }
};

const tryAddButtonToExistingContainer = () => {
  const issueContainer = document.querySelector("[class^=ticketContent__]:not(.tracker-button-initialized)");
  if (issueContainer !== null) {
    issueContainer.classList.add('tracker-button-initialized');
    addButtonToToolbar(issueContainer);
  }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(issuePageShown);

// Start observing the target node for configured mutations
observer.observe(document.body, { childList: true, subtree: true });

// Check if the issue container already exists in the DOM
tryAddButtonToExistingContainer();

const createButtonElement = () => {
  const button = document.createElement("button");
  button.type = 'button';
  button.classList.add('youtrack-timer-button');
  button.classList.add('ring-ui-button_f544');
  button.classList.add('ring-ui-heightS_ea04');
  button.classList.add('ring-ui-inline_e747');
  button.innerHTML = 'Start timer';
  return button;
};

const addButtonToToolbar = async (issueContainer) => {
  const issueToolbar = issueContainer.querySelector("[class^=summaryToolbar__] div");
  if (!issueToolbar) return;

  const issueIdEl = issueContainer.querySelector("[class^=idLink__]") ?? document.querySelector("[class^=idLink__]");
  if (!issueIdEl) return;
  const issueId = issueIdEl.textContent;

  const timerButton = createButtonElement();
  timerButton.setAttribute('data-issue-id', issueId);
  timerButton.setAttribute('data-timer-active', 0);
  timerButton.disabled = true;
  issueToolbar.appendChild(timerButton);
  timerButton.addEventListener("click", timerButtonClick);

  const { currentUser, youtrack_url, authToken } = await chrome.storage.sync.get(['youtrack_url', 'currentUser', 'authToken']);
  YouTrackAPI.init({ currentUser, youtrack_url, authToken });

  try {
    const activeWorkItem = await YouTrackAPI.workItems.getActive();
    const buttonIsActive = activeWorkItem !== null && activeWorkItem.issue.idReadable === issueId;
    timerButton.setAttribute('data-timer-active', buttonIsActive ? 1 : 0);
    timerButton.innerHTML = buttonIsActive ? 'Stop timer' : 'Start timer';
  } catch (e) {
    timerButton.innerHTML = 'Start timer';
  }

  timerButton.disabled = false;
}

const timerButtonClick = async (event) => {
  event.target.disabled = true;

  const { currentUser, youtrack_url, authToken } = await chrome.storage.sync.get(['youtrack_url', 'currentUser', 'authToken']);
  YouTrackAPI.init({ currentUser, youtrack_url, authToken });

  // Stop any active timers.
  await YouTrackAPI.workItems.stopActive();

  const buttonIsActive = parseInt(event.target.getAttribute('data-timer-active'));
  const issueId = event.target.getAttribute('data-issue-id');

  if (!buttonIsActive) {
    const activeWorkItem = await YouTrackAPI.workItems.startTimer(issueId);
    event.target.innerHTML = 'Stop timer';
    event.target.setAttribute('data-timer-active', 1);
    await chrome.runtime.sendMessage({ timer_status: 'on' });
  }
  else {
    event.target.innerHTML = 'Start timer';
    event.target.setAttribute('data-timer-active', 0);
    await chrome.runtime.sendMessage({ timer_status: 'off' });
  }

  event.target.disabled = false;
}


