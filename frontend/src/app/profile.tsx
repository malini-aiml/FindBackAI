import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

import {
  getLoggedInUser,
  logoutUser,
  LoggedInUser,
} from "../lib/auth-storage";

export default function ProfileScreen() {
  const [user, setUser] = useState<LoggedInUser | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const savedUser = await getLoggedInUser();
    setUser(savedUser);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/");
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          Please login first
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.buttonText}>
            Go to Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.logo}>
        FindBack <Text style={styles.ai}>AI</Text>
      </Text>

      <Text style={styles.title}>
        My Profile
      </Text>

      {/* User Information */}
      <View style={styles.card}>

        <Text style={styles.label}>
          Name
        </Text>

        <Text style={styles.value}>
          {user.name}
        </Text>

        <Text style={styles.label}>
          Email
        </Text>

        <Text style={styles.value}>
          {user.email}
        </Text>

      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>
          Logout
        </Text>
      </TouchableOpacity>

      {/* Back */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.backText}>
          Back to Home
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    padding: 24,
    justifyContent: "center",
  },

  logo: {
    fontSize: 28,
    fontWeight: "700",
    color: "#172B4D",
    textAlign: "center",
    marginBottom: 10,
  },

  ai: {
    color: "#2563EB",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#172B4D",
    textAlign: "center",
    marginBottom: 30,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 25,
  },

  label: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 5,
  },

  value: {
    fontSize: 17,
    fontWeight: "600",
    color: "#172B4D",
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  logoutButton: {
    backgroundColor: "#DC2626",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  backButton: {
    marginTop: 18,
    alignItems: "center",
  },

  backText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
});