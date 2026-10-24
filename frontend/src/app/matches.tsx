import React, { useCallback, useState } from "react";

import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  getReports,
  Report,
} from "../lib/storage";

import {
  getLoggedInUser,
} from "../lib/auth-storage";

import {
  getNotifications,
  saveNotification,
} from "../lib/notification-storage";

export type Match = {
  lost: Report;
  found: Report;
  score: number;
};

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

const getWords = (text: string): string[] => {
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
  const words1 = getWords(text1);

  const words2 = new Set(
    getWords(text2)
  );

  return words1.filter((word) =>
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

  words1.forEach((word) => {
    if (words2.has(word)) {
      common++;
    }
  });

  const totalUniqueWords =
    new Set([
      ...words1,
      ...words2,
    ]).size;

  if (totalUniqueWords === 0) {
    return 0;
  }

  return (
    common / totalUniqueWords
  );
};

const parseTime = (
  time: string
): number | null => {
  const normalized = time
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

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];

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

  return hour * 60 + minute;
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

  const difference = Math.abs(
    lostMinutes - foundMinutes
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

const normalizeDate = (
  date: string
): Date | null => {
  const parts =
    date.trim().split("/");

  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month =
    Number(parts[1]) - 1;
  const year = Number(parts[2]);

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
    isNaN(parsedDate.getTime()) ||
    parsedDate.getDate() !== day ||
    parsedDate.getMonth() !== month ||
    parsedDate.getFullYear() !== year
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
    (1000 * 60 * 60 * 24);

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

const calculateMatchScore = (
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
   * IMPORTANT:
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

/*
 * Creates notification for ONE exact
 * lost/found pair.
 */
const createMatchNotification =
  async (
    match: Match,
    userId: number
  ) => {
    try {
      const isMyLostItem =
        Number(match.lost.userId) ===
        Number(userId);

      const isMyFoundItem =
        Number(match.found.userId) ===
        Number(userId);

      if (
        !isMyLostItem &&
        !isMyFoundItem
      ) {
        return;
      }

      /*
       * Never notify when both reports
       * belong to the same user.
       */
      if (
        Number(match.lost.userId) ===
        Number(match.found.userId)
      ) {
        return;
      }

      const notifications =
        await getNotifications();

      const alreadyExists =
        notifications.some(
          (notification) =>
            Number(
              notification.userId
            ) === Number(userId) &&
            notification.title ===
              "Potential Match Found" &&
            String(
              notification.lostItemId
            ) ===
              String(match.lost.id) &&
            String(
              notification.foundItemId
            ) ===
              String(match.found.id)
        );

      if (alreadyExists) {
        return;
      }

      await saveNotification({
        id:
          `notification_match_${match.lost.id}_${match.found.id}_${userId}`,

        userId:
          Number(userId),

        title:
          "Potential Match Found",

        message:
          isMyLostItem
            ? `A found item may match your lost item "${match.lost.itemName}".`
            : `Your found item "${match.found.itemName}" may match someone's lost item.`,

        itemName:
          match.lost.itemName,

        createdAt:
          new Date().toISOString(),

        read: false,

        lostItemId:
          String(match.lost.id),

        foundItemId:
          String(match.found.id),

        score:
          match.score,
      });

      console.log(
        "Match notification created:",
        match.lost.id,
        match.found.id,
        match.score
      );
    } catch (error) {
      console.error(
        "Error creating match notification:",
        error
      );
    }
  };

/*
 * =====================================================
 * AUTOMATIC MATCH CHECK
 * =====================================================
 *
 * This function can be called immediately after
 * a new lost/found report is saved.
 *
 * It does NOT require opening Matches screen.
 */
export const checkForNewMatches =
  async (
    newReport: Report
  ): Promise<void> => {
    try {
      const loggedInUser =
        await getLoggedInUser();

      if (!loggedInUser) {
        return;
      }

      const reports =
        await getReports();

      /*
       * Make sure the new report is
       * actually stored before matching.
       */
      const savedNewReport =
        reports.find(
          (report) =>
            String(report.id) ===
            String(newReport.id)
        );

      if (!savedNewReport) {
        return;
      }

      /*
       * If I created a LOST report,
       * compare it ONLY with other
       * users' FOUND reports.
       */
      if (
        savedNewReport.type ===
        "lost"
      ) {
        const otherFoundReports =
          reports.filter(
            (report) =>
              report.type ===
                "found" &&
              Number(report.userId) !==
                Number(
                  savedNewReport.userId
                )
          );

        for (
          const found of
          otherFoundReports
        ) {
          const score =
            calculateMatchScore(
              savedNewReport,
              found
            );

          if (score >= 40) {
            const match: Match = {
              lost:
                savedNewReport,
              found,
              score,
            };

            /*
             * Notify BOTH users.
             */
            await createMatchNotification(
              match,
              Number(
                savedNewReport.userId
              )
            );

            if (
              found.userId !==
              undefined
            ) {
              await createMatchNotification(
                match,
                Number(
                  found.userId
                )
              );
            }
          }
        }
      }

      /*
       * If I created a FOUND report,
       * compare it ONLY with other
       * users' LOST reports.
       */
      if (
        savedNewReport.type ===
        "found"
      ) {
        const otherLostReports =
          reports.filter(
            (report) =>
              report.type ===
                "lost" &&
              Number(report.userId) !==
                Number(
                  savedNewReport.userId
                )
          );

        for (
          const lost of
          otherLostReports
        ) {
          const score =
            calculateMatchScore(
              lost,
              savedNewReport
            );

          if (score >= 40) {
            const match: Match = {
              lost,
              found:
                savedNewReport,
              score,
            };

            /*
             * Notify BOTH users.
             */
            if (
              lost.userId !==
              undefined
            ) {
              await createMatchNotification(
                match,
                Number(
                  lost.userId
                )
              );
            }

            await createMatchNotification(
              match,
              Number(
                savedNewReport.userId
              )
            );
          }
        }
      }
    } catch (error) {
      /*
       * Matching failure should NEVER
       * stop the report from being saved.
       */
      console.error(
        "Automatic match check failed:",
        error
      );
    }
  };

export default function MatchesScreen() {
  const [matches, setMatches] =
    useState<Match[]>([]);

  const calculateMatches =
    async () => {
      try {
        const user =
          await getLoggedInUser();

        if (!user) {
          setMatches([]);
          return;
        }

        const reports =
          await getReports();

        const myLostReports =
          reports.filter(
            (report) =>
              report.type === "lost" &&
              Number(report.userId) ===
                Number(user.id)
          );

        const myFoundReports =
          reports.filter(
            (report) =>
              report.type === "found" &&
              Number(report.userId) ===
                Number(user.id)
          );

        const otherUsersFoundReports =
          reports.filter(
            (report) =>
              report.type === "found" &&
              Number(report.userId) !==
                Number(user.id)
          );

        const otherUsersLostReports =
          reports.filter(
            (report) =>
              report.type === "lost" &&
              Number(report.userId) !==
                Number(user.id)
          );

        const newMatches: Match[] =
          [];

        /*
         * MY LOST ↔ OTHER USERS' FOUND
         */
        myLostReports.forEach(
          (lost) => {
            otherUsersFoundReports.forEach(
              (found) => {
                const score =
                  calculateMatchScore(
                    lost,
                    found
                  );

                if (score >= 40) {
                  newMatches.push({
                    lost,
                    found,
                    score,
                  });
                }
              }
            );
          }
        );

        /*
         * MY FOUND ↔ OTHER USERS' LOST
         */
        myFoundReports.forEach(
          (found) => {
            otherUsersLostReports.forEach(
              (lost) => {
                const score =
                  calculateMatchScore(
                    lost,
                    found
                  );

                if (score >= 40) {
                  newMatches.push({
                    lost,
                    found,
                    score,
                  });
                }
              }
            );
          }
        );

        /*
         * Remove duplicate pairs.
         */
        const uniqueMatches =
          newMatches.filter(
            (match, index, array) =>
              array.findIndex(
                (item) =>
                  String(
                    item.lost.id
                  ) ===
                    String(
                      match.lost.id
                    ) &&
                  String(
                    item.found.id
                  ) ===
                    String(
                      match.found.id
                    )
              ) === index
          );

        uniqueMatches.sort(
          (a, b) =>
            b.score - a.score
        );

        setMatches(
          uniqueMatches
        );

        /*
         * IMPORTANT:
         *
         * We DO NOT create notifications
         * here anymore.
         *
         * Notifications are created
         * automatically when a report
         * is submitted.
         */
      } catch (error) {
        console.error(
          "Error calculating matches:",
          error
        );

        setMatches([]);
      }
    };

  useFocusEffect(
    useCallback(() => {
      calculateMatches();
    }, [])
  );

  const openMatchDetails = (
    match: Match
  ) => {
    router.push({
      pathname:
        "/match-details",

      params: {
        lostItem:
          JSON.stringify(
            match.lost
          ),

        foundItem:
          JSON.stringify(
            match.found
          ),

        score:
          match.score.toString(),
      },
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <TouchableOpacity
          onPress={() =>
            router.replace("/")
          }
        >
          <Text style={styles.back}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Potential Matches
        </Text>

        <Text
          style={styles.subtitle}
        >
          Matches for your lost and
          found reports.
        </Text>

        <View
          style={styles.infoBox}
        >
          <Text
            style={styles.infoTitle}
          >
            🔎 How matching works
          </Text>

          <Text
            style={styles.infoText}
          >
            FindBack AI compares the
            item name, description,
            location, date, and time.
          </Text>

          <Text
            style={styles.infoNote}
          >
            The score indicates
            similarity, not proof of
            ownership.
          </Text>
        </View>

        {matches.length === 0 ? (
          <View
            style={styles.emptyBox}
          >
            <Text
              style={styles.emptyIcon}
            >
              🔍
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No Potential Matches
            </Text>

            <Text
              style={styles.emptyText}
            >
              No matching found item
              was identified for your
              lost reports.
            </Text>
          </View>
        ) : (
          matches.map(
            (match, index) => (
              <TouchableOpacity
                key={`${match.lost.id}-${match.found.id}`}
                activeOpacity={0.85}
                onPress={() =>
                  openMatchDetails(
                    match
                  )
                }
              >
                <View
                  style={
                    styles.matchHeader
                  }
                >
                  <Text
                    style={
                      styles.matchNumber
                    }
                  >
                    Potential Match #
                    {index + 1}
                  </Text>

                  <View
                    style={
                      styles.scoreBadge
                    }
                  >
                    <Text
                      style={
                        styles.scoreText
                      }
                    >
                      {match.score}%
                      Similar
                    </Text>
                  </View>
                </View>

                {/* LOST ITEM */}
                <View
                  style={
                    styles.reportCard
                  }
                >
                  <View
                    style={
                      styles.typeHeader
                    }
                  >
                    <Text
                      style={
                        styles.lostLabel
                      }
                    >
                      LOST ITEM
                    </Text>
                  </View>

                  {match.lost.image ? (
                    <Image
                      source={{
                        uri:
                          match.lost
                            .image,
                      }}
                      style={
                        styles.image
                      }
                    />
                  ) : (
                    <View
                      style={
                        styles.noImage
                      }
                    >
                      <Text
                        style={
                          styles.noImageText
                        }
                      >
                        No Photo
                      </Text>
                    </View>
                  )}

                  <View
                    style={
                      styles.details
                    }
                  >
                    <Text
                      style={
                        styles.itemName
                      }
                    >
                      {
                        match.lost
                          .itemName
                      }
                    </Text>

                    <Text
                      style={
                        styles.description
                      }
                    >
                      {
                        match.lost
                          .description
                      }
                    </Text>

                    <Text
                      style={
                        styles.info
                      }
                    >
                      📍{" "}
                      {
                        match.lost
                          .location
                      }
                    </Text>

                    <Text
                      style={
                        styles.info
                      }
                    >
                      📅{" "}
                      {
                        match.lost
                          .date
                      }{" "}
                      • ⏰{" "}
                      {
                        match.lost
                          .time
                      }
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.connection
                  }
                >
                  <Text
                    style={
                      styles.connectionText
                    }
                  >
                    ↕
                  </Text>

                  <Text
                    style={
                      styles.connectionLabel
                    }
                  >
                    Tap to view match
                    details
                  </Text>
                </View>

                {/* FOUND ITEM */}
                <View
                  style={
                    styles.reportCard
                  }
                >
                  <View
                    style={
                      styles.typeHeader
                    }
                  >
                    <Text
                      style={
                        styles.foundLabel
                      }
                    >
                      FOUND ITEM
                    </Text>
                  </View>

                  {match.found.image ? (
                    <Image
                      source={{
                        uri:
                          match.found
                            .image,
                      }}
                      style={
                        styles.image
                      }
                    />
                  ) : (
                    <View
                      style={
                        styles.noImage
                      }
                    >
                      <Text
                        style={
                          styles.noImageText
                        }
                      >
                        No Photo
                      </Text>
                    </View>
                  )}

                  <View
                    style={
                      styles.details
                    }
                  >
                    <Text
                      style={
                        styles.itemName
                      }
                    >
                      {
                        match.found
                          .itemName
                      }
                    </Text>

                    <Text
                      style={
                        styles.description
                      }
                    >
                      {
                        match.found
                          .description
                      }
                    </Text>

                    <Text
                      style={
                        styles.info
                      }
                    >
                      📍{" "}
                      {
                        match.found
                          .location
                      }
                    </Text>

                    <Text
                      style={
                        styles.info
                      }
                    >
                      📅{" "}
                      {
                        match.found
                          .date
                      }{" "}
                      • ⏰{" "}
                      {
                        match.found
                          .time
                      }
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F7F9FC",
    },

    content: {
      padding: 24,
      paddingBottom: 40,
    },

    back: {
      fontSize: 16,
      color: "#2563EB",
      marginBottom: 25,
    },

    title: {
      fontSize: 30,
      fontWeight: "700",
      color: "#172B4D",
    },

    subtitle: {
      fontSize: 16,
      color: "#64748B",
      marginTop: 8,
      marginBottom: 18,
    },

    infoBox: {
      backgroundColor:
        "#EFF6FF",
      borderWidth: 1,
      borderColor:
        "#BFDBFE",
      borderRadius: 14,
      padding: 16,
      marginBottom: 22,
    },

    infoTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#1E40AF",
      marginBottom: 6,
    },

    infoText: {
      fontSize: 14,
      color: "#334155",
      lineHeight: 20,
    },

    infoNote: {
      fontSize: 12,
      color: "#64748B",
      lineHeight: 18,
      marginTop: 8,
      fontStyle:
        "italic",
    },

    emptyBox: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 30,
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        "#D9E1EC",
    },

    emptyIcon: {
      fontSize: 40,
      marginBottom: 12,
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#172B4D",
    },

    emptyText: {
      fontSize: 14,
      color: "#64748B",
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
    },

    matchHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      marginBottom: 10,
    },

    matchNumber: {
      fontSize: 17,
      fontWeight: "700",
      color: "#172B4D",
    },

    scoreBadge: {
      backgroundColor:
        "#EAF2FF",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    scoreText: {
      color: "#2563EB",
      fontSize: 13,
      fontWeight: "700",
    },

    reportCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor:
        "#D9E1EC",
    },

    typeHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },

    lostLabel: {
      color: "#DC2626",
      fontSize: 12,
      fontWeight: "800",
    },

    foundLabel: {
      color: "#059669",
      fontSize: 12,
      fontWeight: "800",
    },

    image: {
      width: "100%",
      height: 190,
    },

    noImage: {
      width: "100%",
      height: 150,
      backgroundColor:
        "#E2E8F0",
      alignItems: "center",
      justifyContent:
        "center",
    },

    noImageText: {
      color: "#64748B",
      fontSize: 14,
      fontWeight: "600",
    },

    details: {
      padding: 16,
    },

    itemName: {
      fontSize: 20,
      fontWeight: "700",
      color: "#172B4D",
    },

    description: {
      fontSize: 14,
      color: "#64748B",
      marginTop: 8,
      lineHeight: 20,
    },

    info: {
      fontSize: 14,
      color: "#475569",
      marginTop: 8,
    },

    connection: {
      alignItems: "center",
      paddingVertical: 12,
    },

    connectionText: {
      fontSize: 28,
      color: "#2563EB",
      fontWeight: "700",
    },

    connectionLabel: {
      fontSize: 13,
      color: "#64748B",
      fontWeight: "600",
    },
  });