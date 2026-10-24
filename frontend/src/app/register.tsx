import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

const API_URL = "http://127.0.0.1:8000";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error"
  >("error");

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setMessage("");

    // Validation
    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setMessage(
        "Please fill in all the fields."
      );
      setMessageType("error");
      return;
    }

    if (password.length < 6) {
      setMessage(
        "Password must contain at least 6 characters."
      );
      setMessageType("error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "Passwords do not match."
      );
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.detail ||
            data.message ||
            "Registration failed."
        );
        setMessageType("error");
        return;
      }

      // Registration successful
      setMessageType("success");
      setMessage(
        "Account created successfully. Please login."
      );

      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

    } catch (error) {
      console.log(
        "Registration error:",
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

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        FindBack <Text style={styles.ai}>AI</Text>
      </Text>

      <Text style={styles.title}>
        Create Account
      </Text>

      <Text style={styles.subtitle}>
        Join FindBack AI
      </Text>

      {/* Message */}
      {message !== "" && (
        <View
          style={[
            styles.messageBox,
            messageType === "success"
              ? styles.successBox
              : styles.errorBox,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              messageType === "success"
                ? styles.successText
                : styles.errorText,
            ]}
          >
            {message}
          </Text>
        </View>
      )}

      {/* Name */}
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#94A3B8"
        value={name}
        onChangeText={setName}
      />

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

      {/* Confirm Password */}
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#94A3B8"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      {/* Register */}
      <TouchableOpacity
        style={styles.registerButton}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.registerButtonText}>
          {loading
            ? "Creating Account..."
            : "Sign Up"}
        </Text>
      </TouchableOpacity>

      {/* Login */}
      <View style={styles.loginRow}>
        <Text style={styles.loginText}>
          Already have an account?
        </Text>

        <TouchableOpacity
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.loginLink}>
            Login
          </Text>
        </TouchableOpacity>
      </View>

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
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7F9FC",
  },

  logo: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    color: "#172B4D",
    marginBottom: 10,
  },

  ai: {
    color: "#2563EB",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#172B4D",
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#64748B",
    marginTop: 6,
    marginBottom: 25,
  },

  messageBox: {
    borderRadius: 10,
    padding: 13,
    marginBottom: 15,
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
    fontSize: 14,
    fontWeight: "600",
  },

  successText: {
    color: "#15803D",
  },

  errorText: {
    color: "#B91C1C",
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE9",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 13,
    color: "#172B4D",
  },

  registerButton: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },

  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },

  loginText: {
    color: "#64748B",
    fontSize: 14,
  },

  loginLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 5,
  },

  backButton: {
    alignItems: "center",
    marginTop: 20,
  },

  backText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
  },
});