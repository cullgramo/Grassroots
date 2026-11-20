// Game reminders, set by the phone itself (no server and no account): the app works out which reminders should exist
// and keeps the phone's list equal to that. The website has its own empty version of this file (reminders.web.ts).
//
// Written against the Expo SDK 58 expo-notifications documentation (read 20 Nov 2026).
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { report } from '@/lib/report';
import { reminderChanges, REMINDER_PREFIX, type Reminder } from '@/utils/reminders';

/** False on the website, where a closed page cannot remind anyone. */
export const remindersSupported = true;

/** 'blocked' means the phone will not ask again: the person has to switch notifications on in its settings. */
export type ReminderPermission = 'granted' | 'denied' | 'blocked';

const CHANNEL = 'reminders';

// A reminder that comes due while the app is open is still shown.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// Android 13 and later only show the permission question once a channel exists.
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Game reminders', importance: Notifications.AndroidImportance.DEFAULT });
}

function read(p: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'denied' : 'blocked';
}

/** Whether the phone lets the app show reminders, without asking. */
export async function reminderPermission(): Promise<ReminderPermission> {
  return read(await Notifications.getPermissionsAsync());
}

/** Asks the person to allow reminders, if the phone will still ask. */
export async function askForReminders(): Promise<ReminderPermission> {
  await ensureChannel();
  const now = await Notifications.getPermissionsAsync();
  if (read(now) !== 'denied') return read(now);
  return read(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
}

// One change at a time, so two quick updates cannot set the same reminder twice.
let queue: Promise<unknown> = Promise.resolve();
const inTurn = <T>(job: () => Promise<T>): Promise<T> => {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
};

/** Makes the phone's reminders equal to the plan: removes ours that are no longer wanted and adds the missing ones. */
export function syncReminders(plan: Reminder[]): Promise<void> {
  return inTurn(async () => {
    if ((await reminderPermission()) !== 'granted') return;
    await ensureChannel();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const { cancel, add } = reminderChanges(scheduled.map((n) => n.identifier), plan);
    for (const id of cancel) await Notifications.cancelScheduledNotificationAsync(id);
    for (const r of add) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { fixtureId: r.fixtureId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
      });
    }
  });
}

/** Removes every reminder this app has set. */
export function clearReminders(): Promise<void> {
  return inTurn(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) if (n.identifier.startsWith(REMINDER_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
  });
}

/** Opens the fixture when a reminder is tapped, whether the app was open, in the background or closed. */
export function useOpenFromReminder(): void {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.content.data?.fixtureId;
    if (typeof id !== 'string' || !id) return;
    router.push(`/fixture/${id}`);
    // Forget the tap, so opening the app again later does not jump back to the same fixture.
    Notifications.clearLastNotificationResponseAsync().catch((e) => report(e, 'clearing a reminder tap'));
  }, [response]);
}
