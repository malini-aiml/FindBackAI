import { router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>FindBack</Text>
          <Text style={styles.ai}>AI</Text>
        </View>

        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>
            Find what you've lost.
          </Text>

          <Text style={styles.subtitle}>
            Help return what you've found.
          </Text>
        </View>

        {/* Lost Item */}
        <TouchableOpacity
  style={styles.primaryButton}
  onPress={() => router.push("/lost-item")}
>
          <Text style={styles.buttonIcon}>🔍</Text>

          <View>
            <Text style={styles.buttonTitle}>
              I Lost Something
            </Text>

            <Text style={styles.buttonSubtitle}>
              Report a lost item
            </Text>
          </View>
        </TouchableOpacity>

        {/* Found Item */}
        <TouchableOpacity
  style={styles.secondaryButton}
  onPress={() => router.push("/found-item")}
>
          <Text style={styles.buttonIcon}>📦</Text>

          <View>
            <Text style={styles.buttonTitleDark}>
              I Found Something
            </Text>

            <Text style={styles.buttonSubtitleDark}>
              Report an item you found
            </Text>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>
          Quick Access
        </Text>

        <View style={styles.quickRow}>
          
          <TouchableOpacity
  style={styles.quickCard}
  onPress={() => router.push("/my-reports")}
>
  <Text>📋</Text>
  <Text>My Reports</Text>
</TouchableOpacity>

          <TouchableOpacity
  style={styles.quickCard}
  onPress={() => router.push("/matches")}
>
  <Text>🔍</Text>
  <Text>Matches</Text>
</TouchableOpacity>

        </View>

        {/* Information */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            How FindBack AI works
          </Text>

          <Text style={styles.infoText}>
            Report your lost or found item. FindBack AI
            compares item details, photos, location and
            time to identify potential matches.
          </Text>
        </View>

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

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#172B4D",
  },

  ai: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2563EB",
    marginLeft: 4,
  },

  welcomeSection: {
    marginTop: 45,
    marginBottom: 30,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#172B4D",
    lineHeight: 40,
  },

  subtitle: {
    fontSize: 18,
    color: "#64748B",
    marginTop: 8,
  },

  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9E1EC",
  },

  buttonIcon: {
    fontSize: 30,
    marginRight: 16,
  },

  buttonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  buttonSubtitle: {
    fontSize: 13,
    color: "#DCE8FF",
    marginTop: 4,
  },

  buttonTitleDark: {
    fontSize: 18,
    fontWeight: "700",
    color: "#172B4D",
  },

  buttonSubtitleDark: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172B4D",
    marginTop: 35,
    marginBottom: 15,
  },

  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  quickCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  quickIcon: {
    fontSize: 28,
    marginBottom: 10,
  },

  quickText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },

  infoBox: {
    backgroundColor: "#EAF2FF",
    borderRadius: 16,
    padding: 20,
    marginTop: 30,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#172B4D",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
});