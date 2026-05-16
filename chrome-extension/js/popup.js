
const initPopup = async (activeWorkItemId = null) => {
  let activeWorkItem = null;
  let recentWorkItems = [];
  let favoriteIssues = [];
  let starredIssues = [];
  let todaysWorkItems = [];
  const { currentUser, youtrack_url, authToken, youtrackFavorite } = await chrome.storage.sync.get(['youtrack_url', 'currentUser', 'authToken', 'youtrackFavorite']);
  YouTrackAPI.init({ currentUser, youtrack_url, authToken });

  document.getElementsByClassName('loading-page')[0].style.display = 'block';
  try {
    activeWorkItem = activeWorkItemId !== null
        ? await YouTrackAPI.workItems.getById(activeWorkItemId)
        : await YouTrackAPI.workItems.getActive();

    recentWorkItems = await YouTrackAPI.workItems.getRecentIssues();
    favoriteIssues = await YouTrackAPI.issues.getByIds(youtrackFavorite);
    starredIssues = await YouTrackAPI.issues.getStarred();

    const today = new Date().setHours(0,0,0,0);
    todaysWorkItems = await YouTrackAPI.workItems.getRecent(today);
  }
  catch (e) {
    document.getElementsByClassName('missed-options-page')[0].style.display = 'block';
  }

  document.getElementsByClassName('timesheets-link')[0].href = document.getElementsByClassName('timesheets-link')[0].href.replace('https://_host_', youtrack_url);

  if (activeWorkItem === null) {
    document.getElementsByClassName('no-active-timers')[0].style.display = 'block';
    document.getElementsByClassName('active-timer')[0].style.display = 'none';

    await chrome.runtime.sendMessage({ timer_status: 'off' });
  }
  else {
    document.getElementsByClassName('no-active-timers')[0].style.display = 'none';

    showActiveTimer(activeWorkItem, youtrack_url);

    await chrome.runtime.sendMessage({ timer_status: 'on' });
  }

  showFavoriteIssues(favoriteIssues, recentWorkItems, starredIssues);

  updateTrackedTodayTime(todaysWorkItems, activeWorkItem);

  document.getElementsByClassName('loading-page')[0].style.display = 'none';
};

const stopButtonClick = async (event) => {
  event.target.disabled = true;

  const { currentUser, youtrack_url, authToken } = await chrome.storage.sync.get(['youtrack_url', 'currentUser', 'authToken']);
  YouTrackAPI.init({ currentUser, youtrack_url, authToken });

  const description = document.getElementById('description').value;

  // Stop any active timers.
  await YouTrackAPI.workItems.stopActive(description);

  await chrome.runtime.sendMessage({ timer_status: 'off' });

  //window.close();
  initPopup();
  event.target.disabled = false;
}

const formatMinutes = (totalMinutes) => {
  if (totalMinutes <= 0) return '';
  const days = Math.floor(totalMinutes / 480);
  const hours = Math.floor((totalMinutes % 480) / 60);
  const mins = totalMinutes % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.join(' ');
};

const updateIssueTotalTime = async (issueId) => {
  const totalMinutes = await YouTrackAPI.workItems.getTotalForIssue(issueId);
  const formatted = formatMinutes(totalMinutes);
  document.getElementsByClassName('issue-total-time')[0].innerHTML = formatted ? `· ${formatted} registrado` : '';
};

const selectIssueClick = async (event) => {
  const issueId = event.currentTarget.getAttribute('data-issue-id');
  const issueSummary = event.currentTarget.getAttribute('data-issue-summary');
  const { currentUser, youtrack_url, authToken } = await chrome.storage.sync.get(['youtrack_url', 'currentUser', 'authToken']);
  YouTrackAPI.init({ currentUser, youtrack_url, authToken });
  showSelectedIssue(issueId, issueSummary, youtrack_url);
  updateIssueTotalTime(issueId);
};

const showSelectedIssue = (issueId, issueSummary, youtrack_url) => {
  document.getElementsByClassName('issue-id')[0].innerHTML = issueId;
  document.getElementsByClassName('issue-id')[0].href = `${youtrack_url}/issue/${issueId}`;
  document.getElementsByClassName('issue-summary')[0].innerHTML = issueSummary;
  document.querySelector('.project-name').innerHTML = '';
  document.getElementsByClassName('issue-total-time')[0].innerHTML = '...';
  document.getElementsByClassName('time')[0].innerHTML = '';
  document.getElementById('description').value = '';

  const startBtn = document.getElementsByClassName('start-timer')[0];
  startBtn.setAttribute('data-issue-id', issueId);
  startBtn.style.display = 'inline-block';
  startBtn.onclick = startTimerClick;

  document.getElementsByClassName('stop-timer')[0].style.display = 'none';
  document.getElementsByClassName('active-timer')[0].style.display = 'block';
  document.getElementsByClassName('no-active-timers')[0].style.display = 'none';
  document.getElementsByClassName('cancel')[0].onclick = () => { window.close(); };
};

const startTimerClick = async (event) => {
  event.target.disabled = true;

  const { currentUser, youtrack_url, authToken } = await chrome.storage.sync.get(['youtrack_url', 'currentUser', 'authToken']);
  YouTrackAPI.init({ currentUser, youtrack_url, authToken });

  await YouTrackAPI.workItems.stopActive();

  const issueId = event.target.getAttribute('data-issue-id');
  const startedWorkItem = await YouTrackAPI.workItems.startTimer(issueId);
  await YouTrackAPI.favorites.add(issueId);
  await chrome.runtime.sendMessage({ timer_status: 'on' });

  event.target.disabled = false;
  initPopup(startedWorkItem.id);
};

const showActiveTimer = (activeWorkItem, youtrack_url) => {
  const total = Date.now() - activeWorkItem.created;
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const formattedHours = hours < 10 ? '0' + hours : hours;
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

  document.getElementsByClassName('issue-id')[0].innerHTML = activeWorkItem.issue.idReadable;
  document.getElementsByClassName('issue-id')[0].href = document.getElementsByClassName('issue-id')[0].href
      .replace('https://_host_', youtrack_url)
      .replace('_issue_id_', activeWorkItem.issue.idReadable);
  document.getElementsByClassName('issue-summary')[0].innerHTML = activeWorkItem.issue.summary;
  document.querySelector('.project-name').innerHTML = activeWorkItem.issue.project.name;
  document.getElementsByClassName('issue-total-time')[0].innerHTML = '...';
  document.getElementsByClassName('time')[0].innerHTML = formattedHours + ':' + formattedMinutes;
  updateIssueTotalTime(activeWorkItem.issue.idReadable);

  document.getElementsByClassName('start-timer')[0].style.display = 'none';
  document.getElementsByClassName('stop-timer')[0].style.display = 'inline-block';
  document.getElementsByClassName('active-timer')[0].style.display = 'block';

  document.getElementsByClassName('stop-timer')[0].onclick = stopButtonClick;
  document.getElementsByClassName('cancel')[0].onclick = () => { window.close(); };
}

const updateTrackedTodayTime = (todaysWorkItems, activeWorkItem) => {
  let todaysMinutes = 0;
  todaysWorkItems.forEach((issue) => {
    todaysMinutes += issue.duration.minutes;
  });

  const activeWorkItemDuration = activeWorkItem !== null ? Date.now() - activeWorkItem.created : 0;
  const total = todaysMinutes * 60 * 1000 + activeWorkItemDuration;
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const formattedHours = hours < 10 ? '0' + hours : hours;
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

  document.getElementsByClassName('today-time')[0].innerHTML = formattedHours + ':' + formattedMinutes;

  // @todo: show todays text in icon as badge.
  const badgeText = hours > 0 ? hours + 'h' : '';
  chrome.action.setBadgeText({text: badgeText});
}

const showFavoriteIssues = (favoriteIssues, recentWorkItems, starredIssues = []) => {
  // Output list of favorite issues.
  const favoriteToolbar = document.querySelector(".favorite-issues:not(.initialized)");
  if (favoriteToolbar === null) {
    return;
  }

  favoriteToolbar.classList.add('initialized');
  const issuesList = favoriteIssues || [];

  starredIssues.forEach((issue) => {
    let index = issuesList.findIndex((item) => item.id === issue.id);
    if (index === -1) {
      issuesList.push(issue);
    }
  });

  recentWorkItems.forEach((issue) => {
    let index = issuesList.findIndex((item) => item.id === issue.id);
    if (index === -1) {
      issuesList.push(issue);
    }
  });

  issuesList.forEach((issue) => {
    const label = issue.idReadable + ' ' + issue.summary;

    let timerButton = document.createElement('a');
    timerButton.classList.add('youtrack-timer-button');
    timerButton.innerHTML = label;
    timerButton.setAttribute('data-issue-id', issue.idReadable);
    timerButton.setAttribute('data-issue-summary', issue.summary);

    let listItem = document.createElement('div');
    listItem.appendChild(timerButton);
    favoriteToolbar.appendChild(listItem);
    timerButton.addEventListener('click', selectIssueClick);

    YouTrackAPI.workItems.getTotalForIssue(issue.idReadable).then((totalMinutes) => {
      const formatted = formatMinutes(totalMinutes);
      timerButton.innerHTML = formatted
        ? `${label} <span style="opacity:0.6">( ${formatted} )</span>`
        : label;
    });
  });
}


const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

const formatMinutesShort = (minutes) => {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const renderCalendar = async (year, month) => {
  document.querySelector('.cal-month-label').textContent = `${MONTH_NAMES[month]} ${year}`;

  const grid = document.querySelector('.calendar-grid');
  grid.innerHTML = '<div class="cal-loading">Carregando...</div>';
  document.querySelector('.calendar-total').textContent = '';

  const { currentUser, youtrack_url, authToken } = await chrome.storage.sync.get(['youtrack_url', 'currentUser', 'authToken']);
  YouTrackAPI.init({ currentUser, youtrack_url, authToken });

  const workItems = await YouTrackAPI.workItems.getForMonth(year, month);

  const timerMarker = `[timer_u${currentUser.id}]`;
  const validItems = workItems.filter(item => !item.text || !item.text.includes(timerMarker));

  const dayMinutes = {};
  validItems.forEach(item => {
    const ts = item.date || item.created;
    if (!ts) return;
    const d = new Date(ts);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    dayMinutes[key] = (dayMinutes[key] || 0) + (item.duration?.minutes || 0);
  });

  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const today = new Date();

  for (let i = 0; i < startDow; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cal-day', 'cal-day-empty');
    grid.appendChild(cell);
  }

  let totalMonthMinutes = 0;

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dow = (startDow + day - 1) % 7;
    const key = `${year}-${month}-${day}`;
    const minutes = dayMinutes[key] || 0;
    totalMonthMinutes += minutes;

    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const isWeekend = dow === 0 || dow === 6;

    const cell = document.createElement('div');
    cell.classList.add('cal-day');
    if (isToday) cell.classList.add('cal-day-today');
    if (isWeekend) cell.classList.add('cal-day-weekend');
    if (minutes >= 360) cell.classList.add('cal-day-enough-hours');
    else if (minutes > 0) cell.classList.add('cal-day-low-hours');

    const numEl = document.createElement('span');
    numEl.classList.add('cal-day-num');
    numEl.textContent = day;
    cell.appendChild(numEl);

    if (minutes > 0) {
      const hoursEl = document.createElement('span');
      hoursEl.classList.add('cal-day-hours');
      hoursEl.textContent = formatMinutesShort(minutes);
      cell.appendChild(hoursEl);
    }

    grid.appendChild(cell);
  }

  const totalEl = document.querySelector('.calendar-total');
  totalEl.textContent = totalMonthMinutes > 0
    ? `Total: ${formatMinutes(totalMonthMinutes)}`
    : 'Nenhuma hora registrada neste mês';
};

const toggleCalendar = () => {
  const calView = document.querySelector('.calendar-view');
  const content = document.querySelector('.content');
  const btn = document.querySelector('.calendar-toggle-btn');
  const isShowing = calView.style.display !== 'none';

  if (isShowing) {
    calView.style.display = 'none';
    content.style.display = 'block';
    btn.classList.remove('active');
  } else {
    calView.style.display = 'block';
    content.style.display = 'none';
    btn.classList.add('active');
    calendarYear = new Date().getFullYear();
    calendarMonth = new Date().getMonth();
    renderCalendar(calendarYear, calendarMonth);
  }
};

window.addEventListener("DOMContentLoaded", (event) => {
  // Initialize popup when opened.
  initPopup();

  document.querySelector('.calendar-toggle-btn').addEventListener('click', toggleCalendar);

  document.querySelector('.cal-prev').addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderCalendar(calendarYear, calendarMonth);
  });

  document.querySelector('.cal-next').addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCalendar(calendarYear, calendarMonth);
  });
});

