import AsyncStorage from "@react-native-async-storage/async-storage";

export type Notification = {
  id: string;
  userId: number;
  title: string;
  message: string;
  itemName: string;
  createdAt: string;
  read: boolean;

  lostItemId?: string;
  foundItemId?: string;

  /*
   * Actual similarity score for
   * the exact lost + found pair.
   */
  score?: number;
};

const NOTIFICATIONS_KEY =
  "@findback_notifications";

export async function getNotifications(): Promise<
  Notification[]
> {
  try {
    const stored =
      await AsyncStorage.getItem(
        NOTIFICATIONS_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Notification[];
  } catch (error) {
    console.error(
      "Error loading notifications:",
      error
    );

    return [];
  }
}

export async function saveNotification(
  notification: Notification
): Promise<void> {
  try {
    const existing =
      await getNotifications();

    const updated = [
      notification,
      ...existing,
    ];

    await AsyncStorage.setItem(
      NOTIFICATIONS_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error(
      "Error saving notification:",
      error
    );
  }
}

export async function markNotificationAsRead(
  id: string
): Promise<void> {
  try {
    const existing =
      await getNotifications();

    const updated =
      existing.map(
        (notification) =>
          notification.id === id
            ? {
                ...notification,
                read: true,
              }
            : notification
      );

    await AsyncStorage.setItem(
      NOTIFICATIONS_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error(
      "Error marking notification as read:",
      error
    );
  }
}

export async function deleteNotification(
  id: string
): Promise<void> {
  try {
    const existing =
      await getNotifications();

    const updated =
      existing.filter(
        (notification) =>
          notification.id !== id
      );

    await AsyncStorage.setItem(
      NOTIFICATIONS_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error(
      "Error deleting notification:",
      error
    );

    throw error;
  }
}