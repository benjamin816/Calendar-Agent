import { google } from 'googleapis';

export const getGoogleClients = (accessToken: string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth });
  const tasks = google.tasks({ version: 'v1', auth });

  return { calendar, tasks };
};

export const createCalendarEvent = async (accessToken: string, eventData: any) => {
  const { calendar } = getGoogleClients(accessToken);
  
  // Basic event construction
  const event = {
    summary: eventData.summary,
    description: eventData.description || 'Created via Voice Agent',
    start: {
      dateTime: eventData.startTime, // Expecting ISO string
    },
    end: {
      dateTime: eventData.endTime, // Expecting ISO string
    },
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return res.data;
};

export const createTask = async (accessToken: string, taskData: any) => {
  const { tasks } = getGoogleClients(accessToken);

  const res = await tasks.tasks.insert({
    tasklist: '@default',
    requestBody: {
      title: taskData.summary,
      notes: taskData.description,
      due: taskData.startTime, // Tasks API uses RFC 3339 timestamp
    },
  });

  return res.data;
};

export const listUpcomingEvents = async (accessToken: string) => {
  const { calendar } = getGoogleClients(accessToken);
  const now = new Date().toISOString();
  
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now,
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return res.data.items;
};