const safeJson = async (response) => {
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/json') && !ct.includes('text/json')) {
        throw new Error(`Unexpected response format: ${ct}`);
    }
    return response.json();
};

const YouTrackAPI = {
    url: null,
    authToken: null,
    currentUser: null,

    init(data) {
        this.url = data.youtrack_url;
        this.currentUser = data.currentUser;
        this.authToken = data.authToken;
    },

    users: {
        getCurrent: async function () {
            const fields = 'fields=id,fullName';
            const url = YouTrackAPI.url + '/api/users/me' + `?${fields}`;

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            if (response.ok) {
                return await safeJson(response);
            }
            return null;
        }
    },

    issues: {
        getByIds: async function (ids) {
            if (!ids) return [];
            const fields = 'fields=id,idReadable,summary';
            const query = `issue ID: ${ids}`;
            const url = YouTrackAPI.url + '/api/issues' + `?${fields}&query=${query}`;

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            if (response.ok) {
                return await safeJson(response);
            }
            return null;
        },

        getStarred: async function () {
            const fields = 'fields=id,idReadable,summary';
            const query = encodeURIComponent('starred by: me');
            const url = YouTrackAPI.url + '/api/issues' + `?${fields}&query=${query}&$top=20`;

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            if (response.ok) {
                return await safeJson(response);
            }
            return [];
        }
    },

    favorites: {
        add: async function (issueId) {
            const { youtrackFavorite } = await chrome.storage.sync.get(['youtrackFavorite']);
            const list = youtrackFavorite ? youtrackFavorite.split(',').map(s => s.trim()).filter(Boolean) : [];
            if (!list.includes(issueId)) {
                list.unshift(issueId);
                await chrome.storage.sync.set({ youtrackFavorite: list.join(',') });
            }
        },
        remove: async function (issueId) {
            const { youtrackFavorite } = await chrome.storage.sync.get(['youtrackFavorite']);
            const list = youtrackFavorite ? youtrackFavorite.split(',').map(s => s.trim()).filter(Boolean) : [];
            const updated = list.filter(id => id !== issueId);
            await chrome.storage.sync.set({ youtrackFavorite: updated.join(',') });
        }
    },

    workItems: {
        getById: async function (workItemId) {
            const fields = 'fields=id,created,issue(id,idReadable,summary,project(id,name)),duration(presentation,minutes),text';
            const url = YouTrackAPI.url + `/api/workItems/${workItemId}` + `?${fields}`;
            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            if (response.ok) {
              return await safeJson(response);
            }
            return null;
        },
        getActive: async function () {
            const fields = 'fields=id,created,issue(id,idReadable,summary,project(id,name)),duration(presentation,minutes),text';
            const currentUserId = YouTrackAPI.currentUser.id;
            const timerId = `[timer_u${currentUserId}]`
            const url = YouTrackAPI.url + '/api/workItems' + `?${fields}` + '&author=me&query=' + timerId;
            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            let activeWorkItem = null;
            if (response.ok) {
                const workItems = await safeJson(response);
                workItems.forEach((element, index) => {
                    if (element.text !== null && element.text.includes(timerId)) {
                        activeWorkItem = element;
                        return;
                    }
                });
            }
            return activeWorkItem;
        },
        getRecent: async function (startPeriod) {
            const fields = 'fields=id,created,issue(id,idReadable,summary,updated),duration(presentation,minutes),text';
            const url = YouTrackAPI.url + '/api/workItems' + `?${fields}` + '&author=me&createdStart=' + startPeriod + '&query=sort by: created desc';
            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            let workItems = [];
            if (response.ok) {
                workItems = await safeJson(response);
            }
            return workItems;
        },
        getForMonth: async function (year, month) {
            const startDate = new Date(year, month, 1).getTime();
            const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
            const fields = 'fields=id,date,created,duration(minutes),text';
            const url = YouTrackAPI.url + '/api/workItems' +
                `?${fields}&author=me&createdStart=${startDate}&createdEnd=${endDate}&$top=500`;
            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });
            if (response.ok) {
                return await safeJson(response);
            }
            return [];
        },
        getRecentIssues: async function () {
            const startPeriod = Date.now() - 7 * 86400 * 1000; // Get last 7 days.
            const workItems = await YouTrackAPI.workItems.getRecent(startPeriod);

            const uniqueWorkItemIssues = [];
            workItems.forEach((workItem) => {
                let index = uniqueWorkItemIssues.findIndex((item) => item.id === workItem.issue.id);
                if (index === -1) {
                    // If not found, push a new object with the desired properties
                    uniqueWorkItemIssues.push(workItem.issue);
                }
            });

            uniqueWorkItemIssues.sort((a, b) => b.updated - a.updated);

            return uniqueWorkItemIssues;
        },
        stopActive: async (description = '') => {
            const activeWorkItem = await YouTrackAPI.workItems.getActive();
            if (activeWorkItem === null) {
                return null;
            }

            const itemId = activeWorkItem.id;
            const issueId = activeWorkItem.issue.id;
            const totalTime = Date.now() - activeWorkItem.created;
            const minutes = parseInt((totalTime / 1000 / 60).toFixed());

            await fetch(YouTrackAPI.url + `/api/issues/${issueId}/timeTracking/workItems/${itemId}`, {
                headers: {
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'DELETE',
            });

            const cleanText = description ? description.replace(/(<([^>]+)>)/ig, '') : activeWorkItem.issue.summary;
            const workData = {
                text: cleanText,
                duration: {
                    minutes: minutes < 1 ? 1 : minutes,
                },
            };

            const response = await fetch(YouTrackAPI.url + `/api/issues/${issueId}/timeTracking/workItems`, {
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'POST',
                body: JSON.stringify(workData),
            });
            if (response.ok) {
                return await safeJson(response);
            }
            return response;
        },

        getTotalForIssue: async function (issueId) {
            const fields = 'fields=duration(minutes)';
            const query = encodeURIComponent(`Issue: ${issueId}`);
            const url = YouTrackAPI.url + `/api/workItems?${fields}&author=me&query=${query}`;

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'GET',
            });

            if (response.ok) {
                const items = await safeJson(response);
                return items.reduce((sum, item) => sum + (item.duration?.minutes || 0), 0);
            }
            return 0;
        },

        startTimer: async (issueId) => {
            const url = YouTrackAPI.url + `/api/issues/${issueId}/timeTracking/workItems`;

            const text = `(DON'T CHANGE) Timer [timer_u${YouTrackAPI.currentUser.id}] started.`;
            const workData = {
                text: text,
                duration: {
                    minutes: 1
                },
                // worktype: {name: entry.task} // @todo: add worktype support.
            }

            const response = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${YouTrackAPI.authToken}`,
                },
                method: 'POST',
                body: JSON.stringify(workData),
            });
            if (response.ok) {
              return await safeJson(response);
            }
            return response;
        }
    }
};
