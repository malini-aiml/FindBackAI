import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function MatchDetailsScreen() {
  const params = useLocalSearchParams();

  const lostItem = params.lostItem
    ? JSON.parse(params.lostItem as string)
    : null;

  const foundItem = params.foundItem
    ? JSON.parse(params.foundItem as string)
    : null;

  const score = params.score ? Number(params.score) : 0;

  if (!lostItem || !foundItem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Match Not Found</Text>

          <Text style={styles.errorText}>
            The selected match details could not be loaded.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/matches")}
          >
            <Text style={styles.backButtonText}>
              Back to Matches
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Back */}
        <TouchableOpacity
          onPress={() => router.replace("/matches")}
        >
          <Text style={styles.back}>← Back to Matches</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Match Details</Text>

        <Text style={styles.subtitle}>
          Review the potential match before verification.
        </Text>

        {/* Match Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>
            Potential Match Score
          </Text>

          <Text style={styles.score}>
            {score}%
          </Text>

          <Text style={styles.scoreInfo}>
            This score represents the similarity between
            the two reports.
          </Text>
        </View>

        {/* Lost Item */}
        <View style={styles.card}>

          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>
              Lost Item
            </Text>

            <View style={styles.lostBadge}>
              <Text style={styles.badgeText}>
                LOST
              </Text>
            </View>
          </View>

          {lostItem.image && (
            <Image
              source={{ uri: lostItem.image }}
              style={styles.itemImage}
            />
          )}

          <Text style={styles.itemName}>
            {lostItem.itemName}
          </Text>

          <Text style={styles.description}>
            {lostItem.description}
          </Text>

          <Text style={styles.info}>
            📍 {lostItem.location}
          </Text>

          <Text style={styles.info}>
            📅 {lostItem.date} • ⏰ {lostItem.time}
          </Text>

        </View>

        {/* Found Item */}
        <View style={styles.card}>

          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>
              Found Item
            </Text>

            <View style={styles.foundBadge}>
              <Text style={styles.badgeText}>
                FOUND
              </Text>
            </View>
          </View>

          {foundItem.image && (
            <Image
              source={{ uri: foundItem.image }}
              style={styles.itemImage}
            />
          )}

          <Text style={styles.itemName}>
            {foundItem.itemName}
          </Text>

          <Text style={styles.description}>
            {foundItem.description}
          </Text>

          <Text style={styles.info}>
            📍 {foundItem.location}
          </Text>

          <Text style={styles.info}>
            📅 {foundItem.date} • ⏰ {foundItem.time}
          </Text>

        </View>

        {/* Verification Information */}
        <View style={styles.verificationBox}>

          <Text style={styles.verificationTitle}>
            🔐 Verification Required
          </Text>

          <Text style={styles.verificationText}>
            Before claiming the item, you will need to
            answer private verification questions. These
            questions help confirm ownership without
            exposing private identifying details.
          </Text>

        </View>

        {/* Continue */}
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() =>
            router.push({
              pathname: "/verification",
              params: {
                lostItem: JSON.stringify(lostItem),
                foundItem: JSON.stringify(foundItem),
                score: score.toString(),
              },
            })
          }
        >
          <Text style={styles.verifyButtonText}>
            Continue to Verification
          </Text>
        </TouchableOpacity>

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
    padding: 20,
    paddingBottom: 40,
  },

  back: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 18,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#172B4D",
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 22,
  },

  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  scoreLabel: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },

  score: {
    fontSize: 42,
    fontWeight: "800",
    color: "#2563EB",
    marginTop: 6,
  },

  scoreInfo: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#172B4D",
  },

  lostBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  foundBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },

  itemImage: {
    width: "100%",
    height: 190,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: "#E2E8F0",
  },

  itemName: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172B4D",
    marginBottom: 7,
  },

  description: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 12,
  },

  info: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 5,
  },

  verificationBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 18,
  },

  verificationTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E40AF",
    marginBottom: 8,
  },

  verificationText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },

  verifyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#172B4D",
    marginBottom: 8,
  },

  errorText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },

  backButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});