import React, {
  useCallback,
  useState,
} from "react";

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  getLoggedInUser,
} from "../lib/auth-storage";

import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  Notification,
} from "../lib/notification-storage";

import {
  getReports,
  Report,
} from "../lib/storage";

// ==================================================
// STOP WORDS
// Same scoring logic as matches.tsx
// ==================================================

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "is",
  "was",
  "with",
  "has",
  "have",
  "my",
  "this",
  "that",
  "item",
  "lost",
  "found",
  "near",
  "at",
  "in",
  "on",
  "of",
  "to",
  "from",
  "very",
  "small",
  "large",
  "new",
  "old",
]);

// ==================================================
// TEXT HELPERS
// ==================================================

const getWords = (
  text: string
): string[] => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 3 &&
        !STOP_WORDS.has(word)
    );
};

const getCommonWordCount = (
  text1: string,
  text2: string
): number => {
  const words1 =
    getWords(text1);

  const words2 = new Set(
    getWords(text2)
  );

  return words1.filter(
    (word) =>
      words2.has(word)
  ).length;
};

const getTextSimilarity = (
  text1: string,
  text2: string
): number => {
  const words1 = new Set(
    getWords(text1)
  );

  const words2 = new Set(
    getWords(text2)
  );

  if (
    words1.size === 0 ||
    words2.size === 0
  ) {
    return 0;
  }

  let common = 0;

  words1.forEach(
    (word) => {
      if (words2.has(word)) {
        common++;
      }
    }
  );

  const totalUniqueWords =
    new Set([
      ...words1,
      ...words2,
    ]).size;

  if (
    totalUniqueWords === 0
  ) {
    return 0;
  }

  return (
    common /
    totalUniqueWords
  );
};

// ==================================================
// TIME SCORE
// ==================================================

const parseTime = (
  time: string
): number | null => {
  const normalized =
    time
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const match =
    normalized.match(
      /^(\d{1,2}):(\d{2})\s*(am|pm)?$/
    );

  if (!match) {
    return null;
  }

  let hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  const period =
    match[3];

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  if (
    period === "pm" &&
    hour < 12
  ) {
    hour += 12;
  }

  if (
    period === "am" &&
    hour === 12
  ) {
    hour = 0;
  }

  return (
    hour * 60 + minute
  );
};

const getTimeScore = (
  lostTime: string,
  foundTime: string
): number => {
  const lostMinutes =
    parseTime(lostTime);

  const foundMinutes =
    parseTime(foundTime);

  if (
    lostMinutes === null ||
    foundMinutes === null
  ) {
    return 0;
  }

  const difference =
    Math.abs(
      lostMinutes -
        foundMinutes
    );

  if (difference <= 15) {
    return 10;
  }

  if (difference <= 30) {
    return 7;
  }

  if (difference <= 60) {
    return 4;
  }

  return 0;
};

// ==================================================
// LOCATION SCORE
// ==================================================

const getLocationScore = (
  lostLocation: string,
  foundLocation: string
): number => {
  const lost =
    lostLocation
      .toLowerCase()
      .trim();

  const found =
    foundLocation
      .toLowerCase()
      .trim();

  if (!lost || !found) {
    return 0;
  }

  if (lost === found) {
    return 20;
  }

  if (
    lost.includes(found) ||
    found.includes(lost)
  ) {
    return 18;
  }

  const commonWords =
    getCommonWordCount(
      lost,
      found
    );

  if (commonWords >= 2) {
    return 15;
  }

  if (commonWords === 1) {
    return 8;
  }

  return 0;
};

// ==================================================
// ITEM NAME SCORE
// ==================================================

const getItemNameScore = (
  lostName: string,
  foundName: string
): number => {
  const lost =
    lostName
      .toLowerCase()
      .trim();

  const found =
    foundName
      .toLowerCase()
      .trim();

  if (!lost || !found) {
    return 0;
  }

  if (lost === found) {
    return 40;
  }

  if (
    lost.includes(found) ||
    found.includes(lost)
  ) {
    return 35;
  }

  const similarity =
    getTextSimilarity(
      lost,
      found
    );

  if (similarity >= 0.7) {
    return 30;
  }

  if (similarity >= 0.4) {
    return 20;
  }

  return 0;
};

// ==================================================
// DESCRIPTION SCORE
// ==================================================

const getDescriptionScore = (
  lostDescription: string,
  foundDescription: string
): number => {
  const similarity =
    getTextSimilarity(
      lostDescription,
      foundDescription
    );

  const commonWords =
    getCommonWordCount(
      lostDescription,
      foundDescription
    );

  if (
    similarity >= 0.7 &&
    commonWords >= 4
  ) {
    return 30;
  }

  if (
    similarity >= 0.5 &&
    commonWords >= 3
  ) {
    return 25;
  }

  if (
    similarity >= 0.3 &&
    commonWords >= 2
  ) {
    return 18;
  }

  if (commonWords >= 1) {
    return 10;
  }

  return 0;
};

// ==================================================
// DATE SCORE
// ==================================================

const normalizeDate = (
  date: string
): Date | null => {
  const parts =
    date.trim().split("/");

  if (parts.length !== 3) {
    return null;
  }

  const day =
    Number(parts[0]);

  const month =
    Number(parts[1]) - 1;

  const year =
    Number(parts[2]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return null;
  }

  const parsedDate =
    new Date(
      year,
      month,
      day
    );

  if (
    isNaN(
      parsedDate.getTime()
    ) ||
    parsedDate.getDate() !==
      day ||
    parsedDate.getMonth() !==
      month ||
    parsedDate.getFullYear() !==
      year
  ) {
    return null;
  }

  return parsedDate;
};

const getDateScore = (
  lostDateText: string,
  foundDateText: string
): number => {
  const lostDate =
    normalizeDate(
      lostDateText
    );

  const foundDate =
    normalizeDate(
      foundDateText
    );

  if (!lostDate || !foundDate) {
    return 0;
  }

  const difference =
    Math.abs(
      lostDate.getTime() -
        foundDate.getTime()
    ) /
    (1000 *
      60 *
      60 *
      24);

  if (difference === 0) {
    return 10;
  }

  if (difference <= 1) {
    return 5;
  }

  if (difference <= 2) {
    return 2;
  }

  return 0;
};

// ==================================================
// SAME MATCH SCORE AS matches.tsx
// ==================================================

const calculateNotificationMatchScore = (
  lost: Report,
  found: Report
): number => {
  if (
    lost.type !== "lost" ||
    found.type !== "found"
  ) {
    return 0;
  }

  const itemNameScore =
    getItemNameScore(
      lost.itemName,
      found.itemName
    );

  /*
   * Different item names = no match.
   */
  if (itemNameScore === 0) {
    return 0;
  }

  let score =
    itemNameScore;

  score +=
    getDescriptionScore(
      lost.description,
      found.description
    );

  score +=
    getLocationScore(
      lost.location,
      found.location
    );

  score +=
    getDateScore(
      lost.date,
      found.date
    );

  score +=
    getTimeScore(
      lost.time,
      found.time
    );

  return Math.min(
    score,
    100
  );
};

// ==================================================
// NOTIFICATIONS SCREEN
// ==================================================

export default function NotificationsScreen() {
  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] =
    useState(true);

  // ==================================================
  // LOAD NOTIFICATIONS
  // ==================================================

  const loadNotifications =
    async () => {
      try {
        setLoading(true);

        const user =
          await getLoggedInUser();

        if (!user) {
          setNotifications([]);
          return;
        }

        const allNotifications =
          await getNotifications();

        const userNotifications =
          allNotifications.filter(
            (notification) =>
              Number(
                notification.userId
              ) ===
              Number(user.id)
          );

        /*
         * Remove duplicate notifications
         * for the same exact lost/found pair.
         */
        const uniqueNotifications: Notification[] =
          [];

        const seenKeys =
          new Set<string>();

        for (
          const notification of
          userNotifications
        ) {
          let key = "";

          if (
            notification.lostItemId &&
            notification.foundItemId
          ) {
            key =
              `${notification.title}_${notification.lostItemId}_${notification.foundItemId}_${notification.userId}`;
          } else {
            key =
              `${notification.title}_${notification.itemName}_${notification.message}`;
          }

          if (
            seenKeys.has(key)
          ) {
            continue;
          }

          seenKeys.add(key);

          uniqueNotifications.push(
            notification
          );
        }

        setNotifications(
          uniqueNotifications
        );
      } catch (error) {
        console.error(
          "Error loading notifications:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  // ==================================================
  // MARK AS READ
  // ==================================================

  const handleNotificationPress =
    async (
      notification: Notification
    ) => {
      try {
        if (!notification.read) {
          await markNotificationAsRead(
            notification.id
          );

          setNotifications(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  notification.id
                    ? {
                        ...item,
                        read: true,
                      }
                    : item
              )
          );
        }
      } catch (error) {
        console.error(
          "Error marking notification as read:",
          error
        );
      }
    };

  // ==================================================
  // OPEN MATCH DETAILS
  // ==================================================

  const handleViewMatch =
    async (
      notification: Notification
    ) => {
      try {
        /*
         * Mark notification as read.
         */
        if (!notification.read) {
          await markNotificationAsRead(
            notification.id
          );

          setNotifications(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  notification.id
                    ? {
                        ...item,
                        read: true,
                      }
                    : item
              )
          );
        }

        /*
         * Load reports.
         */
        const reports =
          await getReports();

        let lostItem:
          | Report
          | null = null;

        let foundItem:
          | Report
          | null = null;

        // ==================================================
        // FIRST: EXACT REPORT IDs
        // ==================================================

        if (
          notification.lostItemId &&
          notification.foundItemId
        ) {
          lostItem =
            reports.find(
              (report) =>
                String(
                  report.id
                ) ===
                String(
                  notification.lostItemId
                )
            ) || null;

          foundItem =
            reports.find(
              (report) =>
                String(
                  report.id
                ) ===
                String(
                  notification.foundItemId
                )
            ) || null;
        }

        // ==================================================
        // FALLBACK: FIND BY ITEM NAME
        // ==================================================

        if (
          !lostItem ||
          !foundItem
        ) {
          const user =
            await getLoggedInUser();

          if (!user) {
            Alert.alert(
              "Login Required",
              "Please login to view the match."
            );

            return;
          }

          /*
           * Current user's reports.
           */
          const myReports =
            reports.filter(
              (report) =>
                Number(
                  report.userId
                ) ===
                Number(user.id)
            );

          /*
           * Current user LOST
           * ↔ another user FOUND
           */
          const myLost =
            myReports.find(
              (report) =>
                report.type ===
                  "lost" &&
                report.itemName
                  .trim()
                  .toLowerCase() ===
                  notification.itemName
                    .trim()
                    .toLowerCase()
            );

          if (myLost) {
            const matchingFound =
              reports.find(
                (report) =>
                  report.type ===
                    "found" &&
                  Number(
                    report.userId
                  ) !==
                    Number(user.id) &&
                  report.itemName
                    .trim()
                    .toLowerCase() ===
                    myLost.itemName
                      .trim()
                      .toLowerCase()
              );

            if (
              matchingFound
            ) {
              lostItem =
                myLost;

              foundItem =
                matchingFound;
            }
          }

          /*
           * Current user FOUND
           * ↔ another user LOST
           */
          if (
            !lostItem ||
            !foundItem
          ) {
            const myFound =
              myReports.find(
                (report) =>
                  report.type ===
                    "found" &&
                  report.itemName
                    .trim()
                    .toLowerCase() ===
                    notification.itemName
                      .trim()
                      .toLowerCase()
              );

            if (myFound) {
              const matchingLost =
                reports.find(
                  (report) =>
                    report.type ===
                      "lost" &&
                    Number(
                      report.userId
                    ) !==
                      Number(user.id) &&
                    report.itemName
                      .trim()
                      .toLowerCase() ===
                      myFound.itemName
                        .trim()
                        .toLowerCase()
                );

              if (
                matchingLost
              ) {
                lostItem =
                  matchingLost;

                foundItem =
                  myFound;
              }
            }
          }
        }

        // ==================================================
        // MATCH NOT FOUND
        // ==================================================

        if (
          !lostItem ||
          !foundItem
        ) {
          Alert.alert(
            "Match Not Found",
            "The reports connected to this notification could not be found."
          );

          return;
        }

        // ==================================================
        // CALCULATE EXACT SAME SCORE
        // AS matches.tsx
        // ==================================================

        const matchScore =
          calculateNotificationMatchScore(
            lostItem,
            foundItem
          );

        console.log(
          "Notification match score:",
          matchScore
        );

        console.log(
          "Lost item:",
          lostItem.id
        );

        console.log(
          "Found item:",
          foundItem.id
        );

        console.log(
          "Stored notification score:",
          notification.score
        );

        // ==================================================
        // OPEN MATCH DETAILS
        // ==================================================

        router.push({
          pathname:
            "/match-details",

          params: {
            lostItem:
              JSON.stringify(
                lostItem
              ),

            foundItem:
              JSON.stringify(
                foundItem
              ),

            score:
              String(matchScore),
          },
        });
      } catch (error) {
        console.error(
          "Error opening match:",
          error
        );

        Alert.alert(
          "Error",
          "Unable to open the match details."
        );
      }
    };

  // ==================================================
  // DELETE
  // ==================================================

  const handleDelete =
    async (
      notification: Notification
    ) => {
      try {
        await deleteNotification(
          notification.id
        );

        setNotifications(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                notification.id
            )
        );
      } catch (error) {
        console.error(
          "Error deleting notification:",
          error
        );

        Alert.alert(
          "Delete Failed",
          "Unable to delete this notification."
        );
      }
    };

  // ==================================================
  // FORMAT DATE
  // ==================================================

  const formatDate = (
    dateString: string
  ) => {
    try {
      return new Date(
        dateString
      ).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  // ==================================================
  // UI
  // ==================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (
              router.canGoBack()
            ) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
        >
          <Text
            style={styles.backText}
          >
            ←
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.headerTitleContainer
          }
        >
          <Text
            style={styles.headerTitle}
          >
            Notifications
          </Text>

          {unreadCount > 0 && (
            <Text
              style={
                styles.unreadHeaderText
              }
            >
              {unreadCount} unread
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        {/* LOADING */}

        {loading ? (
          <View
            style={
              styles.emptyContainer
            }
          >
            <Text
              style={styles.emptyText}
            >
              Loading notifications...
            </Text>
          </View>
        ) : notifications.length ===
          0 ? (
          /* EMPTY */

          <View
            style={
              styles.emptyContainer
            }
          >
            <Text
              style={styles.emptyIcon}
            >
              🔔
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No notifications
            </Text>

            <Text
              style={styles.emptyText}
            >
              You don't have any
              notifications yet.
            </Text>
          </View>
        ) : (
          notifications.map(
            (notification) => (
              <View
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read &&
                    styles.unreadCard,
                ]}
              >
                {/* NOTIFICATION */}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    handleNotificationPress(
                      notification
                    )
                  }
                >
                  <View
                    style={
                      styles.notificationTop
                    }
                  >
                    <View
                      style={
                        styles.notificationIconContainer
                      }
                    >
                      <Text
                        style={
                          styles.notificationIcon
                        }
                      >
                        🔔
                      </Text>
                    </View>

                    <View
                      style={
                        styles.notificationMain
                      }
                    >
                      <View
                        style={
                          styles.titleRow
                        }
                      >
                        <Text
                          style={
                            styles.notificationTitle
                          }
                        >
                          {
                            notification.title
                          }
                        </Text>

                        {!notification.read && (
                          <View
                            style={
                              styles.unreadDot
                            }
                          />
                        )}
                      </View>

                      <Text
                        style={
                          styles.notificationMessage
                        }
                      >
                        {
                          notification.message
                        }
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.itemBox}
                  >
                    <Text
                      style={
                        styles.itemLabel
                      }
                    >
                      Item
                    </Text>

                    <Text
                      style={
                        styles.itemName
                      }
                    >
                      {
                        notification.itemName
                      }
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* VIEW MATCH */}

                {(notification.title ===
                  "Potential Match Found" ||
                  notification.title ===
                    "Item Verification Successful") && (
                  <TouchableOpacity
                    style={
                      styles.viewMatchButton
                    }
                    onPress={() =>
                      handleViewMatch(
                        notification
                      )
                    }
                  >
                    <Text
                      style={
                        styles.viewMatchText
                      }
                    >
                      View Match & Claim Item
                    </Text>
                  </TouchableOpacity>
                )}

                {/* BOTTOM */}

                <View
                  style={
                    styles.bottomRow
                  }
                >
                  <Text
                    style={
                      styles.dateText
                    }
                  >
                    {formatDate(
                      notification.createdAt
                    )}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.deleteButton
                    }
                    onPress={() =>
                      handleDelete(
                        notification
                      )
                    }
                  >
                    <Text
                      style={
                        styles.deleteText
                      }
                    >
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F7F9FC",
    },

    header: {
      flexDirection:
        "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor:
        "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor:
        "#E2E8F0",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        "#EAF2FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    backText: {
      fontSize: 26,
      color: "#2563EB",
      fontWeight: "600",
    },

    headerTitleContainer: {
      flex: 1,
    },

    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: "#172B4D",
    },

    unreadHeaderText: {
      fontSize: 13,
      color: "#2563EB",
      marginTop: 2,
      fontWeight: "600",
    },

    content: {
      padding: 20,
      paddingBottom: 40,
    },

    notificationCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor:
        "#E2E8F0",
    },

    unreadCard: {
      borderColor:
        "#93C5FD",
      backgroundColor:
        "#F8FBFF",
    },

    notificationTop: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
    },

    notificationIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor:
        "#EAF2FF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    notificationIcon: {
      fontSize: 21,
    },

    notificationMain: {
      flex: 1,
    },

    titleRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    notificationTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "700",
      color: "#172B4D",
    },

    unreadDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        "#2563EB",
      marginLeft: 8,
    },

    notificationMessage: {
      fontSize: 14,
      lineHeight: 21,
      color: "#475569",
      marginTop: 6,
    },

    itemBox: {
      backgroundColor:
        "#F7F9FC",
      borderRadius: 10,
      padding: 12,
      marginTop: 15,
    },

    itemLabel: {
      fontSize: 12,
      color: "#64748B",
      fontWeight: "600",
      marginBottom: 3,
    },

    itemName: {
      fontSize: 15,
      color: "#172B4D",
      fontWeight: "700",
    },

    viewMatchButton: {
      backgroundColor:
        "#2563EB",
      borderRadius: 10,
      paddingVertical: 13,
      alignItems:
        "center",
      marginTop: 14,
    },

    viewMatchText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },

    bottomRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop: 14,
    },

    dateText: {
      flex: 1,
      fontSize: 12,
      color: "#94A3B8",
    },

    deleteButton: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },

    deleteText: {
      fontSize: 13,
      color: "#EF4444",
      fontWeight: "700",
    },

    emptyContainer: {
      alignItems: "center",
      justifyContent:
        "center",
      paddingTop: 100,
      paddingHorizontal: 30,
    },

    emptyIcon: {
      fontSize: 50,
      marginBottom: 16,
    },

    emptyTitle: {
      fontSize: 21,
      fontWeight: "700",
      color: "#172B4D",
      marginBottom: 8,
    },

    emptyText: {
      fontSize: 14,
      color: "#64748B",
      textAlign: "center",
      lineHeight: 21,
    },
  });