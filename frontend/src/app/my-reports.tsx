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

import {
  getReports,
  deleteReport,
  saveReport,
  Report,
} from "../lib/storage";

import { getLoggedInUser } from "../lib/auth-storage";

export default function MyReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [imageErrors, setImageErrors] = useState<{
    [key: string]: boolean;
  }>({});

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ==================================================
  // LOAD CURRENT USER'S REPORTS
  // ==================================================

  const loadReports = async () => {
    try {
      const loggedInUser = await getLoggedInUser();

      // User is logged out
      if (!loggedInUser) {
        setIsLoggedIn(false);
        setReports([]);
        return;
      }

      setIsLoggedIn(true);

      // Get all locally stored reports
      const data = await getReports();

      // ==================================================
      // MIGRATE OLD REPORTS
      // ==================================================
      //
      // Reports created before userId was added do not
      // have a userId. We assign those legacy reports
      // to the currently logged-in user.
      //
      // New reports already have userId, so they are
      // NOT changed.
      //

      let reportsChanged = false;

      const migratedReports: Report[] = data.map(
        (report) => {
          if (
            report.userId === undefined ||
            report.userId === null
          ) {
            reportsChanged = true;

            return {
              ...report,
              userId: loggedInUser.id,
              uploadedBy:
                report.uploadedBy ||
                loggedInUser.name,
            };
          }

          return report;
        }
      );

      // Save migrated reports only if something changed
      if (reportsChanged) {
        await AsyncStorageSaveReports(
          migratedReports
        );
      }

      // ==================================================
      // SHOW ONLY CURRENT USER'S REPORTS
      // ==================================================

      const myReports = migratedReports.filter(
        (report) =>
          Number(report.userId) ===
          Number(loggedInUser.id)
      );

      setReports(myReports);

    } catch (error) {
      console.log(
        "Error loading reports:",
        error
      );

      setReports([]);
    }
  };

  // ==================================================
  // SAVE ALL REPORTS
  // ==================================================

  const AsyncStorageSaveReports = async (
    allReports: Report[]
  ) => {
    try {
      // We use saveReport only for individual reports,
      // so here we directly update the existing storage.
      const AsyncStorage =
        require("@react-native-async-storage/async-storage")
          .default;

      await AsyncStorage.setItem(
        "@findback_reports",
        JSON.stringify(allReports)
      );
    } catch (error) {
      console.log(
        "Error saving migrated reports:",
        error
      );
    }
  };

  // ==================================================
  // RELOAD EVERY TIME THIS SCREEN BECOMES ACTIVE
  // ==================================================

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  // ==================================================
  // DELETE REPORT
  // ==================================================

  const handleDelete = async (id: string) => {
    await deleteReport(id);
    await loadReports();
  };

  // ==================================================
  // IMAGE ERROR
  // ==================================================

  const handleImageError = (
    id: string,
    error: any
  ) => {
    console.log(
      "Image loading failed for report:",
      id,
      error?.nativeEvent?.error
    );

    setImageErrors((previous) => ({
      ...previous,
      [id]: true,
    }));
  };

  // ==================================================
  // LOGGED OUT SCREEN
  // ==================================================

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={
            styles.loggedOutContent
          }
        >
          <TouchableOpacity
            onPress={() => router.replace("/")}
          >
            <Text style={styles.back}>
              ← Back
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            My Reports
          </Text>

          <Text style={styles.subtitle}>
            View the items you have reported.
          </Text>

          <View style={styles.loginBox}>
            <Text style={styles.loginIcon}>
              🔐
            </Text>

            <Text style={styles.loginTitle}>
              Please Login First
            </Text>

            <Text style={styles.loginText}>
              You need to login to view your
              lost and found reports.
            </Text>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() =>
                router.replace("/login")
              }
            >
              <Text style={styles.loginButtonText}>
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================================================
  // LOGGED IN UI
  // ==================================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          onPress={() => router.replace("/")}
        >
          <Text style={styles.back}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          My Reports
        </Text>

        <Text style={styles.subtitle}>
          View the items you have reported.
        </Text>

        {reports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>
              📋
            </Text>

            <Text style={styles.emptyTitle}>
              No Reports Yet
            </Text>

            <Text style={styles.emptyText}>
              Your lost and found reports will
              appear here.
            </Text>
          </View>
        ) : (
          reports.map((report) => (
            <View
              key={report.id}
              style={styles.reportCard}
            >
              {/* Report Image */}
              {report.image &&
              !imageErrors[report.id] ? (
                <Image
                  source={{
                    uri: report.image,
                  }}
                  style={styles.reportImage}
                  resizeMode="contain"
                  onError={(error) =>
                    handleImageError(
                      report.id,
                      error
                    )
                  }
                />
              ) : (
                <View
                  style={styles.imagePlaceholder}
                >
                  <Text
                    style={
                      styles.placeholderIcon
                    }
                  >
                    📷
                  </Text>

                  <Text
                    style={
                      styles.placeholderText
                    }
                  >
                    Photo not available
                  </Text>
                </View>
              )}

              {/* Report Details */}
              <View
                style={styles.reportDetails}
              >
                <View style={styles.topRow}>
                  <Text
                    style={styles.itemName}
                  >
                    {report.itemName}
                  </Text>

                  <View
                    style={[
                      styles.typeBadge,
                      report.type === "lost"
                        ? styles.lostBadge
                        : styles.foundBadge,
                    ]}
                  >
                    <Text
                      style={styles.typeText}
                    >
                      {report.type === "lost"
                        ? "LOST"
                        : "FOUND"}
                    </Text>
                  </View>
                </View>

                {/* Uploaded By */}
                <Text
                  style={styles.uploadedBy}
                >
                  Uploaded by:{" "}
                  {report.uploadedBy || "You"}
                </Text>

                {/* Description */}
                <Text
                  style={styles.description}
                >
                  {report.description}
                </Text>

                {/* Location */}
                <Text style={styles.info}>
                  📍 {report.location}
                </Text>

                {/* Date + Time */}
                <Text style={styles.info}>
                  📅 {report.date} • ⏰{" "}
                  {report.time}
                </Text>

                {/* Status */}
                <View
                  style={styles.statusRow}
                >
                  <Text
                    style={styles.statusLabel}
                  >
                    Status:
                  </Text>

                  <Text
                    style={styles.status}
                  >
                    {report.status}
                  </Text>
                </View>

                {/* Delete */}
                <TouchableOpacity
                  style={
                    styles.deleteButton
                  }
                  onPress={() =>
                    handleDelete(
                      report.id
                    )
                  }
                >
                  <Text
                    style={styles.deleteText}
                  >
                    Delete Report
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  content: {
    padding: 24,
    paddingBottom: 40,
  },

  loggedOutContent: {
    padding: 24,
    flexGrow: 1,
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
    marginBottom: 25,
  },

  loginBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    marginTop: 20,
  },

  loginIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  loginTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#172B4D",
  },

  loginText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 20,
  },

  loginButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
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
  },

  reportCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D9E1EC",
  },

  reportImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#F1F5F9",
  },

  imagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#E9EEF5",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },

  placeholderText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },

  reportDetails: {
    padding: 16,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  itemName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172B4D",
    flex: 1,
    marginRight: 10,
  },

  uploadedBy: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 7,
  },

  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  lostBadge: {
    backgroundColor: "#FFF1F2",
  },

  foundBadge: {
    backgroundColor: "#ECFDF5",
  },

  typeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },

  description: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 10,
    lineHeight: 20,
  },

  info: {
    fontSize: 14,
    color: "#475569",
    marginTop: 9,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  status: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
    marginLeft: 5,
  },

  deleteButton: {
    backgroundColor: "#FFF1F2",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 15,
  },

  deleteText: {
    color: "#DC2626",
    fontWeight: "600",
  },
});