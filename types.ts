export type ActionType = 'create_event' | 'create_task' | 'list_events' | 'unknown';

export interface CalendarAction {
  action: ActionType;
  summary?: string;
  startTime?: string; // ISO String
  endTime?: string;   // ISO String
  description?: string;
  date?: string;      // For all-day events or relative dates
}

export interface VoiceResponse {
  success: boolean;
  message: string;
  data?: any;
}