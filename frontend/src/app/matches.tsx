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
import { router, useFocusEffect } from "expo-router";
import { getReports, Report } from "./storage";

type Match = {
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

// Convert text into useful words
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

// Calculate how many meaningful words are shared
const getCommonWordCount = (
  text1: string,
  text2: string
): number => {
  const words1 = getWords(text1);
  const words2 = new Set(getWords(text2));

  return words1.filter((word) =>
    words2.has(word)
  ).length;
};

// Calculate text similarity percentage
const getTextSimilarity = (
  text1: string,
  text2: string
): number => {
  const words1 = new Set(getWords(text1));
  const words2 = new Set(getWords(text2));

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  let common = 0;

  words1.forEach((word) => {
    if (words2.has(word)) {
      common++;
    }
  });

  const totalUniqueWords = new Set([
    ...words1,
    ...words2,
  ]).size;

  if (totalUniqueWords === 0) {
    return 0;
  }

  return common / totalUniqueWords;
};

// Convert time such as "2:30 PM" to minutes
const parseTime = (
  time: string
): number | null => {
  const normalized = time
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const match = normalized.match(
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

  if (period === "pm" && hour < 12) {
    hour += 12;
  }

  if (period === "am" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
};

// Calculate time similarity
const getTimeScore = (
  lostTime: string,
  foundTime: string
): number => {
  const lostMinutes = parseTime(lostTime);
  const foundMinutes = parseTime(foundTime);

  if (
    lostMinutes === null ||
    foundMinutes === null
  ) {
    return 0;
  }

  const difference = Math.abs(
    lostMinutes - foundMinutes
  );

  // Same or very close time
  if (difference <= 15) {
    return 10;
  }

  // Within 30 minutes
  if (difference <= 30) {
    return 7;
  }

  // Within 60 minutes
  if (difference <= 60) {
    return 4;
  }

  // More than 60 minutes apart
  return 0;
};

// Calculate location similarity
const getLocationScore = (
  lostLocation: string,
  foundLocation: string
): number => {
  const lost = lostLocation.toLowerCase().trim();
  const found = foundLocation.toLowerCase().trim();

  if (!lost || !found) {
    return 0;
  }

  // Exact location
  if (lost === found) {
    return 20;
  }

  // One location contains the other
  if (
    lost.includes(found) ||
    found.includes(lost)
  ) {
    return 18;
  }

  const commonWords = getCommonWordCount(
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

// Calculate item-name similarity
const getItemNameScore = (
  lostName: string,
  foundName: string
): number => {
  const lost = lostName.toLowerCase().trim();
  const found = foundName.toLowerCase().trim();

  if (!lost || !found) {
    return 0;
  }

  // Exact name
  if (lost === found) {
    return 40;
  }

  // One name contains the other
  if (
    lost.includes(found) ||
    found.includes(lost)
  ) {
    return 35;
  }

  const similarity = getTextSimilarity(
    lost,
    found
  );

  if (similarity >= 0.7) {
    return 30;
  }

  if (similarity >= 0.4) {
    return 20;
  }

  if (similarity > 0) {
    return 10;
  }

  return 0;
};

// Calculate description score
const getDescriptionScore = (
  lostDescription: string,
  foundDescription: string
): number => {
  const similarity = getTextSimilarity(
    lostDescription,
    foundDescription
  );

  const commonWords = getCommonWordCount(
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

// Convert DD/MM/YYYY into a Date
const normalizeDate = (
  date: string
): Date | null => {
  const parts = date.trim().split("/");

  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return null;
  }

  const parsedDate = new Date(
    year,
    month,
    day
  );

  // Check whether the date is actually valid
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

// Calculate date similarity
const getDateScore = (
  lostDateText: string,
  foundDateText: string
): number => {
  const lostDate = normalizeDate(
    lostDateText
  );

  const foundDate = normalizeDate(
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

  // Same date
  if (difference === 0) {
    return 10;
  }

  // One day apart
  if (difference <= 1) {
    return 5;
  }

  // Two days apart
  if (difference <= 2) {
    return 2;
  }

  // More than two days apart
  return 0;
};

// Calculate complete match score
const calculateMatchScore = (
  lost: Report,
  found: Report
): number => {
  let score = 0;

  // 1. Item name: maximum 40
  score += getItemNameScore(
    lost.itemName,
    found.itemName
  );

  // 2. Description: maximum 30
  score += getDescriptionScore(
    lost.description,
    found.description
  );

  // 3. Location: maximum 20
  score += getLocationScore(
    lost.location,
    found.location
  );

  // 4. Date: maximum 10
  score += getDateScore(
    lost.date,
    found.date
  );

  // 5. Time: maximum 10
  score += getTimeScore(
    lost.time,
    found.time
  );

  return Math.min(score, 100);
};

export default function MatchesScreen() {
  const [matches, setMatches] =
    useState<Match[]>([]);

  const calculateMatches = async () => {
    const reports = await getReports();

    const lostReports = reports.filter(
      (report) => report.type === "lost"
    );

    const foundReports = reports.filter(
      (report) => report.type === "found"
    );

    const newMatches: Match[] = [];

    lostReports.forEach((lost) => {
      foundReports.forEach((found) => {
        // Calculate similarity score
        const score = calculateMatchScore(
          lost,
          found
        );

        /*
         * Only show reports with meaningful similarity.
         *
         * This prevents every Lost/Found report from
         * appearing as a potential match.
         */
        if (score >= 20) {
          newMatches.push({
            lost,
            found,
            score,
          });
        }
      });
    });

    // Highest similarity first
    newMatches.sort(
      (a, b) => b.score - a.score
    );

    setMatches(newMatches);
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
      pathname: "/match-details",
      params: {
        lostItem: JSON.stringify(
          match.lost
        ),
        foundItem: JSON.stringify(
          match.found
        ),
        score: match.score.toString(),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.replace("/")}
        >
          <Text style={styles.back}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>
          Potential Matches
        </Text>

        <Text style={styles.subtitle}>
          Reports with similar item details,
          location, date, and time.
        </Text>

        {/* Matching explanation */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            🔎 How matching works
          </Text>

          <Text style={styles.infoText}>
            FindBack AI compares the item name,
            description, location, date, and time
            to identify potential matches.
          </Text>

          <Text style={styles.infoNote}>
            The score indicates similarity, not
            proof of ownership.
          </Text>
        </View>

        {/* No Matches */}
        {matches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>
              🔍
            </Text>

            <Text style={styles.emptyTitle}>
              No Potential Matches
            </Text>

            <Text style={styles.emptyText}>
              When a lost and found report has
              enough similar details, it will
              appear here.
            </Text>
          </View>
        ) : (
          matches.map((match, index) => (
            <TouchableOpacity
              key={`${match.lost.id}-${match.found.id}`}
              activeOpacity={0.85}
              onPress={() =>
                openMatchDetails(match)
              }
            >
              {/* Match Header */}
              <View style={styles.matchHeader}>
                <Text style={styles.matchNumber}>
                  Potential Match #{index + 1}
                </Text>

                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>
                    {match.score}% Similar
                  </Text>
                </View>
              </View>

              {/* Lost Item */}
              <View style={styles.reportCard}>
                <View style={styles.typeHeader}>
                  <Text style={styles.lostLabel}>
                    LOST ITEM
                  </Text>
                </View>

                {match.lost.image ? (
                  <Image
                    source={{
                      uri: match.lost.image,
                    }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.noImage}>
                    <Text
                      style={styles.noImageText}
                    >
                      No Photo
                    </Text>
                  </View>
                )}

                <View style={styles.details}>
                  <Text style={styles.itemName}>
                    {match.lost.itemName}
                  </Text>

                  <Text
                    style={styles.description}
                  >
                    {match.lost.description}
                  </Text>

                  <Text style={styles.info}>
                    📍 {match.lost.location}
                  </Text>

                  <Text style={styles.info}>
                    📅 {match.lost.date} • ⏰{" "}
                    {match.lost.time}
                  </Text>
                </View>
              </View>

              {/* Connection */}
              <View style={styles.connection}>
                <Text style={styles.connectionText}>
                  ↕
                </Text>

                <Text
                  style={styles.connectionLabel}
                >
                  Tap to view match details
                </Text>
              </View>

              {/* Found Item */}
              <View style={styles.reportCard}>
                <View style={styles.typeHeader}>
                  <Text style={styles.foundLabel}>
                    FOUND ITEM
                  </Text>
                </View>

                {match.found.image ? (
                  <Image
                    source={{
                      uri: match.found.image,
                    }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.noImage}>
                    <Text
                      style={styles.noImageText}
                    >
                      No Photo
                    </Text>
                  </View>
                )}

                <View style={styles.details}>
                  <Text style={styles.itemName}>
                    {match.found.itemName}
                  </Text>

                  <Text
                    style={styles.description}
                  >
                    {match.found.description}
                  </Text>

                  <Text style={styles.info}>
                    📍 {match.found.location}
                  </Text>

                  <Text style={styles.info}>
                    📅 {match.found.date} • ⏰{" "}
                    {match.found.time}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
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
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
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
    fontStyle: "italic",
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9E1EC",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  matchNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: "#172B4D",
  },

  scoreBadge: {
    backgroundColor: "#EAF2FF",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D9E1EC",
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
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
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