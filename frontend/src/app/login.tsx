import { saveLoggedInUser } from "../lib/auth-storage";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";

const API_URL = "http://127.0.0.1:8000";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  const handleLogin = async () => {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessageType("error");
      setMessage("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");

        setMessage(
          data.detail ||
            data.message ||
            "Invalid email or password."
        );

        return;
      }

      // Save logged-in user
      try {
        await saveLoggedInUser(data.user);
      } catch (storageError) {
        console.error(
          "Storage error:",
          storageError
        );
      }

      // Show success notification
      setMessageType("success");

      setMessage(
        `Login Successful! Welcome, ${data.user.name}.`
      );

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setMessageType("error");

      setMessage(
        "Could not connect to the FindBack AI server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace("/");
  };

  // Go to Sign Up page
  const handleSignUp = () => {
    router.replace("/register");
  };

  return (
    <View style={styles.container}>

      {/* Logo */}
      <Text style={styles.title}>
        FindBack AI
      </Text>

      <Text style={styles.subtitle}>
        Login to your account
      </Text>

      {/* Notification */}
      {message !== "" && (
        <View
          style={[
            styles.messageBox,
            messageType === "success" &&
              styles.successBox,
            messageType === "error" &&
              styles.errorBox,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              messageType === "success" &&
                styles.successText,
              messageType === "error" &&
                styles.errorText,
            ]}
          >
            {message}
          </Text>
        </View>
      )}

      {/* Email */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#94A3B8"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {/* Password */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94A3B8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Login Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? "Logging in..."
            : "Login"}
        </Text>
      </TouchableOpacity>

      {/* Sign Up */}
      <View style={styles.signupRow}>
        <Text style={styles.signupText}>
          New to FindBack AI?
        </Text>

        <TouchableOpacity
          onPress={handleSignUp}
        >
          <Text style={styles.signupLink}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>

      {/* Continue after successful login */}
      {messageType === "success" &&
        message !== "" && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text
              style={
                styles.continueButtonText
              }
            >
              Continue
            </Text>
          </TouchableOpacity>
        )}

      {/* Back to Home */}
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
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#ffffff",
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#172B4D",
  },

  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
    color: "#666666",
  },

  messageBox: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
  },

  successBox: {
    backgroundColor: "#E8F7EE",
    borderColor: "#22C55E",
  },

  errorBox: {
    backgroundColor: "#FDECEC",
    borderColor: "#EF4444",
  },

  messageText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },

  successText: {
    color: "#15803D",
  },

  errorText: {
    color: "#B91C1C",
  },

  input: {
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: "#ffffff",
  },

  button: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "bold",
  },

  // Sign Up
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },

  signupText: {
    color: "#64748B",
    fontSize: 14,
  },

  signupLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 5,
  },

  continueButton: {
    backgroundColor: "#16A34A",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },

  continueButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "bold",
  },

  backButton: {
    marginTop: 20,
    alignItems: "center",
  },

  backText: {
    color: "#2563eb",
    fontSize: 16,
  },
});