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
import { getReports, deleteReport, Report } from "./storage";

export default function MyReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [imageErrors, setImageErrors] = useState<{
    [key: string]: boolean;
  }>({});

  const loadReports = async () => {
    const data = await getReports();
    setReports(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const handleDelete = async (id: string) => {
    await deleteReport(id);
    await loadReports();
  };

  const handleImageError = (id: string, error: any) => {
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Back */}
        <TouchableOpacity onPress={() => router.replace("/")}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>My Reports</Text>

        <Text style={styles.subtitle}>
          View the items you have reported.
        </Text>

        {/* No Reports */}
        {reports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>

            <Text style={styles.emptyTitle}>
              No Reports Yet
            </Text>

            <Text style={styles.emptyText}>
              Your lost and found reports will appear here.
            </Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>

              {/* Report Image */}
              {report.image && !imageErrors[report.id] ? (
                <Image
                  source={{ uri: report.image }}
                  style={styles.reportImage}
                  resizeMode="contain"
                  onError={(error) =>
                    handleImageError(report.id, error)
                  }
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderIcon}>
                    📷
                  </Text>

                  <Text style={styles.placeholderText}>
                    Photo not available
                  </Text>
                </View>
              )}

              {/* Report Details */}
              <View style={styles.reportDetails}>

                {/* Item name + type */}
                <View style={styles.topRow}>
                  <Text style={styles.itemName}>
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
                    <Text style={styles.typeText}>
                      {report.type === "lost"
                        ? "LOST"
                        : "FOUND"}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.description}>
                  {report.description}
                </Text>

                {/* Location */}
                <Text style={styles.info}>
                  📍 {report.location}
                </Text>

                {/* Date + Time */}
                <Text style={styles.info}>
                  📅 {report.date} • ⏰ {report.time}
                </Text>

                {/* Status */}
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>
                    Status:
                  </Text>

                  <Text style={styles.status}>
                    {report.status}
                  </Text>
                </View>

                {/* Delete */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(report.id)}
                >
                  <Text style={styles.deleteText}>
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
    marginBottom: 25,
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