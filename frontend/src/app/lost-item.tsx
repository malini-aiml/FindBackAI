import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";

import { saveReport } from "./storage";

// FastAPI backend
const API_URL = "http://127.0.0.1:8000";

export default function LostItemScreen() {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Private verification questions
  const [question1, setQuestion1] = useState("");
  const [answer1, setAnswer1] = useState("");

  const [question2, setQuestion2] = useState("");
  const [answer2, setAnswer2] = useState("");

  const [question3, setQuestion3] = useState("");
  const [answer3, setAnswer3] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Pick image
  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setMessage("Please allow photo library permission.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setMessage("");
      }
    } catch (error) {
      console.log("Image picker error:", error);
      setMessage("Unable to select image.");
    }
  };

  // Save image permanently
  const saveImagePermanently = async (
    uri: string
  ): Promise<string> => {
    try {
      // Web
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();

        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else {
              reject(
                new Error("Could not convert image to Data URL")
              );
            }
          };

          reader.onerror = () => {
            reject(new Error("Could not read image"));
          };

          reader.readAsDataURL(blob);
        });
      }

      // Android / iOS
      const fileName = `lost_${Date.now()}.jpg`;

      const directory =
        FileSystem.documentDirectory ||
        FileSystem.cacheDirectory;

      if (!directory) {
        return uri;
      }

      const destination = `${directory}${fileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: destination,
      });

      return destination;
    } catch (error) {
      console.log(
        "Permanent image save error:",
        error
      );

      // If permanent save fails, use original URI
      return uri;
    }
  };

  // Submit Lost Item
  const handleSubmit = async () => {
    setMessage("");

    // Validation
    if (!itemName.trim()) {
      setMessage("Please enter the item name.");
      return;
    }

    if (!description.trim()) {
      setMessage("Please enter the item description.");
      return;
    }

    if (!location.trim()) {
      setMessage("Please enter the location.");
      return;
    }

    if (!date.trim()) {
      setMessage("Please enter the date.");
      return;
    }

    if (!time.trim()) {
      setMessage("Please enter the time.");
      return;
    }

    if (!image) {
      setMessage("Please select an image.");
      return;
    }

    if (!question1.trim() || !answer1.trim()) {
      setMessage(
        "Please complete verification question 1."
      );
      return;
    }

    if (!question2.trim() || !answer2.trim()) {
      setMessage(
        "Please complete verification question 2."
      );
      return;
    }

    if (!question3.trim() || !answer3.trim()) {
      setMessage(
        "Please complete verification question 3."
      );
      return;
    }

    try {
      setIsSaving(true);
      setMessage("Saving lost item report...");

      // Save image permanently
      const permanentImageUri =
        await saveImagePermanently(image);

      // Create local report
      const newReport = {
        id: `lost_${Date.now()}`,
        type: "lost" as const,
        itemName: itemName.trim(),
        description: description.trim(),
        location: location.trim(),
        date: date.trim(),
        time: time.trim(),
        image: permanentImageUri,

        verificationQuestions: [
          {
            question: question1.trim(),
            answer: answer1.trim(),
          },
          {
            question: question2.trim(),
            answer: answer2.trim(),
          },
          {
            question: question3.trim(),
            answer: answer3.trim(),
          },
        ],

        status: "Searching" as const,
        createdAt: new Date().toISOString(),
      };

      // Save locally
      await saveReport(newReport);

      // Send report to FastAPI backend
      const backendResponse = await fetch(
        `${API_URL}/items`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            type: "lost",
            item_name: itemName.trim(),
            description: description.trim(),
            location: location.trim(),
            date: date.trim(),
            time: time.trim(),
            image: permanentImageUri,
            status: "Searching",
          }),
        }
      );

      if (!backendResponse.ok) {
        throw new Error(
          `Backend request failed: ${backendResponse.status}`
        );
      }

      const backendData =
        await backendResponse.json();

      console.log(
        "Backend response:",
        backendData
      );

      setMessage(
        `Lost item report saved successfully for "${itemName.trim()}".`
      );

      // Clear form
      setItemName("");
      setDescription("");
      setLocation("");
      setDate("");
      setTime("");
      setImage(null);

      setQuestion1("");
      setAnswer1("");
      setQuestion2("");
      setAnswer2("");
      setQuestion3("");
      setAnswer3("");
    } catch (error) {
      console.log("Submit error:", error);

      setMessage(
        "Report was saved locally, but could not connect to the backend."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>
              Report Lost Item
            </Text>

            <Text style={styles.subtitle}>
              Help FindBack AI find your lost item
            </Text>
          </View>
        </View>

        {/* Item Name */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Item Name *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: Black Backpack"
            placeholderTextColor="#94A3B8"
            value={itemName}
            onChangeText={setItemName}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Description *
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            placeholder="Describe the item in detail..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Image */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Item Photo *
          </Text>

          <TouchableOpacity
            style={styles.imageButton}
            onPress={pickImage}
          >
            <Text style={styles.imageButtonIcon}>
              📷
            </Text>

            <Text style={styles.imageButtonText}>
              {image
                ? "Change Photo"
                : "Select Photo"}
            </Text>
          </TouchableOpacity>

          {image && (
            <View
              style={styles.imagePreviewContainer}
            >
              <Image
                source={{ uri: image }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Location *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: Computer Lab 1"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Date *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: 03/10/2026"
            placeholderTextColor="#94A3B8"
            value={date}
            onChangeText={setDate}
          />
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Time *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: 1:30 PM"
            placeholderTextColor="#94A3B8"
            value={time}
            onChangeText={setTime}
          />
        </View>

        {/* Verification */}
        <View style={styles.verificationCard}>
          <Text style={styles.verificationTitle}>
            🔐 Private Verification Questions
          </Text>

          <Text
            style={styles.verificationDescription}
          >
            These answers are private and can help
            verify ownership later.
          </Text>

          {/* Question 1 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionLabel}>
              Question 1 *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: What color is the keychain?"
              placeholderTextColor="#94A3B8"
              value={question1}
              onChangeText={setQuestion1}
            />

            <TextInput
              style={styles.input}
              placeholder="Answer"
              placeholderTextColor="#94A3B8"
              value={answer1}
              onChangeText={setAnswer1}
              secureTextEntry
            />
          </View>

          {/* Question 2 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionLabel}>
              Question 2 *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: What is inside the bag?"
              placeholderTextColor="#94A3B8"
              value={question2}
              onChangeText={setQuestion2}
            />

            <TextInput
              style={styles.input}
              placeholder="Answer"
              placeholderTextColor="#94A3B8"
              value={answer2}
              onChangeText={setAnswer2}
              secureTextEntry
            />
          </View>

          {/* Question 3 */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionLabel}>
              Question 3 *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Example: What sticker is on it?"
              placeholderTextColor="#94A3B8"
              value={question3}
              onChangeText={setQuestion3}
            />

            <TextInput
              style={styles.input}
              placeholder="Answer"
              placeholderTextColor="#94A3B8"
              value={answer3}
              onChangeText={setAnswer3}
              secureTextEntry
            />
          </View>
        </View>

        {/* Message */}
        {message !== "" && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              {message}
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSaving &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          <Text style={styles.submitButtonText}>
            {isSaving
              ? "Saving..."
              : "Submit Lost Item"}
          </Text>
        </TouchableOpacity>

        {/* Bottom note */}
        <Text style={styles.bottomNote}>
          FindBack AI will compare your report with
          found-item reports.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8EEF9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  backText: {
    fontSize: 26,
    color: "#172B4D",
    marginTop: -2,
  },

  title: {
    fontSize: 25,
    fontWeight: "700",
    color: "#172B4D",
  },

  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  section: {
    marginBottom: 20,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#172B4D",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#172B4D",
    marginBottom: 10,
  },

  textArea: {
    minHeight: 120,
  },

  imageButton: {
    backgroundColor: "#E8F0FF",
    borderWidth: 1,
    borderColor: "#BFD2FF",
    borderRadius: 12,
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
  },

  imageButtonIcon: {
    fontSize: 30,
    marginBottom: 6,
  },

  imageButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
  },

  imagePreviewContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },

  imagePreview: {
    width: "100%",
    height: 220,
  },

  verificationCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE9",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },

  verificationTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#172B4D",
    marginBottom: 6,
  },

  verificationDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 19,
    marginBottom: 18,
  },

  questionBlock: {
    marginBottom: 8,
  },

  questionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },

  messageBox: {
    backgroundColor: "#EEF4FF",
    borderRadius: 10,
    padding: 13,
    marginBottom: 16,
  },

  messageText: {
    color: "#2563EB",
    fontSize: 14,
    lineHeight: 20,
  },

  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  bottomNote: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
});