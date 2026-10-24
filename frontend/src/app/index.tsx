import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import {
  getLoggedInUser,
  LoggedInUser,
} from "../lib/auth-storage";

import {
  getNotifications,
} from "../lib/notification-storage";

export default function HomeScreen() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check login status and notifications whenever Home becomes active
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadHomeData = async () => {
        try {
          const savedUser = await getLoggedInUser();

          if (!active) {
            return;
          }

          setUser(savedUser);

          if (savedUser) {
            const notifications =
              await getNotifications();

            const unread =
              notifications.filter(
                (notification) =>
                  Number(notification.userId) ===
                    Number(savedUser.id) &&
                  !notification.read
              ).length;

            if (active) {
              setUnreadCount(unread);
            }
          } else {
            setUnreadCount(0);
          }
        } catch (error) {
          console.error(
            "Error loading Home data:",
            error
          );
        }
      };

      loadHomeData();

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>FindBack</Text>
            <Text style={styles.ai}>AI</Text>
          </View>

          {/* Header Actions */}
          <View style={styles.headerActions}>

            {/* Notifications */}
            {user && (
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() =>
                  router.push("/notifications")
                }
              >
                <Text style={styles.notificationIcon}>
                  🔔
                </Text>

                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9
                        ? "9+"
                        : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Login / Logged-in User */}
            {user ? (
              <TouchableOpacity
                style={styles.userButton}
                onPress={() =>
                  router.push("/profile")
                }
              >
                <Text style={styles.userButtonText}>
                  {user.name}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() =>
                  router.push("/login")
                }
              >
                <Text style={styles.loginButtonText}>
                  Login
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
          onPress={() =>
            router.push("/lost-item")
          }
        >
          <Text style={styles.buttonIcon}>
            🔍
          </Text>

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
          onPress={() =>
            router.push("/found-item")
          }
        >
          <Text style={styles.buttonIcon}>
            📦
          </Text>

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

          {/* My Reports */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() =>
              router.push("/my-reports")
            }
          >
            <Text style={styles.quickIcon}>
              📋
            </Text>

            <Text style={styles.quickText}>
              My Reports
            </Text>
          </TouchableOpacity>

          {/* Matches */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() =>
              router.push("/matches")
            }
          >
            <Text style={styles.quickIcon}>
              🔍
            </Text>

            <Text style={styles.quickText}>
              Matches
            </Text>
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
    justifyContent: "space-between",
    marginTop: 10,
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
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

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  notificationIcon: {
    fontSize: 22,
  },

  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* Login button */
  loginButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  /* Logged-in user button */
  userButton: {
    backgroundColor: "#EAF2FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2563EB",
    maxWidth: 160,
  },

  userButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
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