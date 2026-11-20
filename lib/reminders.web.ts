// The website's version of lib/reminders.ts. A web page that is closed cannot remind anyone, so everything here
// does nothing; the More tab says reminders work in the phone app.
import type { Reminder } from '@/utils/reminders';

export const remindersSupported = false;

export type ReminderPermission = 'granted' | 'denied' | 'blocked';

export async function reminderPermission(): Promise<ReminderPermission> {
  return 'denied';
}

export async function askForReminders(): Promise<ReminderPermission> {
  return 'denied';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- same shape as the phone's version
export async function syncReminders(plan: Reminder[]): Promise<void> {}

export async function clearReminders(): Promise<void> {}

export function useOpenFromReminder(): void {}
