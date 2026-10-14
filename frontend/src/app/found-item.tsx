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

const API_URL = "http://127.0.0.1:8000";

export default function FoundItemScreen() {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<string | null>(null);

  // ==================================================
  // PICK IMAGE
  // ==================================================

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setMessage(
        "⚠️ Please allow photo access to select an item photo."
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setMessage("");
    }
  };

  // ==================================================
  // REMOVE IMAGE
  // ==================================================

  const removeImage = () => {
    setImage(null);
  };

  // ==================================================
  // SAVE IMAGE PERMANENTLY
  // ==================================================

  const saveImagePermanently = async (
    uri: string
  ): Promise<string> => {

    // WEB
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();

      return await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else {
              reject(
                new Error("Unable to convert image.")
              );
            }
          };

          reader.onerror = () => {
            reject(
              new Error(
                "Unable to read selected image."
              )
            );
          };

          reader.readAsDataURL(blob);
        }
      );
    }

    // ANDROID / iOS
    const fileName = `found_${Date.now()}.jpg`;

    const permanentUri =
      `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.copyAsync({
      from: uri,
      to: permanentUri,
    });

    return permanentUri;
  };

  // ==================================================
  // SUBMIT REPORT
  // ==================================================

  const handleSubmit = async () => {

    // Validate details
    if (
      itemName.trim() === "" ||
      description.trim() === "" ||
      location.trim() === "" ||
      date.trim() === "" ||
      time.trim() === ""
    ) {
      setMessage(
        "⚠️ Please fill in all the fields."
      );
      return;
    }

    // Validate image
    if (!image) {
      setMessage(
        "⚠️ Please add a photo of the found item."
      );
      return;
    }

    try {

      // ==================================================
      // SAVE IMAGE
      // ==================================================

      const permanentImageUri =
        await saveImagePermanently(image);

      // ==================================================
      // CREATE LOCAL REPORT
      // ==================================================

      const newReport = {
        id: Date.now().toString(),

        type: "found" as const,

        itemName: itemName.trim(),

        description: description.trim(),

        location: location.trim(),

        date: date.trim(),

        time: time.trim(),

        image: permanentImageUri,

        status: "Active" as const,

        createdAt: new Date().toISOString(),
      };

      // ==================================================
      // SAVE LOCALLY
      // ==================================================

      await saveReport(newReport);

      // ==================================================
      // SEND TO FASTAPI BACKEND
      // ==================================================

      const backendResponse = await fetch(
        `${API_URL}/items`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            type: "found",

            item_name: itemName.trim(),

            description: description.trim(),

            location: location.trim(),

            date: date.trim(),

            time: time.trim(),

            image: permanentImageUri,

            status: "Active",
          }),
        }
      );

      // ==================================================
      // CHECK BACKEND RESPONSE
      // ==================================================

      if (!backendResponse.ok) {
        throw new Error(
          `Backend error: ${backendResponse.status}`
        );
      }

      const backendData =
        await backendResponse.json();

      console.log(
        "Found item saved to backend:",
        backendData
      );

      // ==================================================
      // SUCCESS MESSAGE
      // ==================================================

      setMessage(
        `✅ Found item report saved successfully for "${itemName}".`
      );

      // ==================================================
      // CLEAR FORM
      // ==================================================

      setItemName("");
      setDescription("");
      setLocation("");
      setDate("");
      setTime("");
      setImage(null);

    } catch (error) {

      console.log(
        "Error saving found item:",
        error
      );

      setMessage(
        "⚠️ Report was saved locally, but could not connect to the backend."
      );
    }
  };

  // ==================================================
  // UI
  // ==================================================

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* Back Button */}

        <TouchableOpacity
          onPress={() => router.replace("/")}
        >
          <Text style={styles.back}>
            ← Back
          </Text>
        </TouchableOpacity>

        {/* Title */}

        <Text style={styles.title}>
          I Found Something
        </Text>

        <Text style={styles.subtitle}>
          Help return this item to its owner.
        </Text>

        {/* Item Name */}

        <Text style={styles.label}>
          Item Name
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Example: Black wallet"
          placeholderTextColor="#94A3B8"
          value={itemName}
          onChangeText={setItemName}
        />

        {/* Description */}

        <Text style={styles.label}>
          Description
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.textArea,
          ]}
          placeholder="Describe what you found..."
          placeholderTextColor="#94A3B8"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {/* Location */}

        <Text style={styles.label}>
          Found Location
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Where did you find it?"
          placeholderTextColor="#94A3B8"
          value={location}
          onChangeText={setLocation}
        />

        {/* Date */}

        <Text style={styles.label}>
          Date
        </Text>

        <TextInput
          style={styles.input}
          placeholder="DD / MM / YYYY"
          placeholderTextColor="#94A3B8"
          value={date}
          onChangeText={setDate}
        />

        {/* Time */}

        <Text style={styles.label}>
          Approximate Time
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Example: 3:10 PM"
          placeholderTextColor="#94A3B8"
          value={time}
          onChangeText={setTime}
        />

        {/* Photo */}

        <Text style={styles.label}>
          Item Photo
        </Text>

        {!image ? (

          <TouchableOpacity
            style={styles.photoButton}
            onPress={pickImage}
          >
            <Text style={styles.photoText}>
              📷 Add Item Photo
            </Text>
          </TouchableOpacity>

        ) : (

          <View style={styles.imageContainer}>

            <Image
              source={{ uri: image }}
              style={styles.previewImage}
              resizeMode="contain"
            />

            <View style={styles.imageActions}>

              <TouchableOpacity
                style={styles.changeButton}
                onPress={pickImage}
              >
                <Text style={styles.changeText}>
                  🔄 Change Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={removeImage}
              >
                <Text style={styles.removeText}>
                  ❌ Remove
                </Text>
              </TouchableOpacity>

            </View>

          </View>
        )}

        {/* Submit */}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>
            Report Found Item
          </Text>
        </TouchableOpacity>

        {/* Message */}

        {message !== "" && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              {message}
            </Text>
          </View>
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
    marginBottom: 30,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: "#172B4D",
  },

  textArea: {
    height: 110,
    textAlignVertical: "top",
  },

  photoButton: {
    backgroundColor: "#EAF2FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9E1EC",
  },

  photoText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
  },

  imageContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D9E1EC",
  },

  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
  },

  imageActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  changeButton: {
    backgroundColor: "#EAF2FF",
    borderRadius: 10,
    padding: 12,
    flex: 1,
    marginRight: 6,
    alignItems: "center",
  },

  changeText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 14,
  },

  removeButton: {
    backgroundColor: "#FFF1F2",
    borderRadius: 10,
    padding: 12,
    flex: 1,
    marginLeft: 6,
    alignItems: "center",
  },

  removeText: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 14,
  },

  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    padding: 17,
    alignItems: "center",
    marginTop: 20,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  messageBox: {
    backgroundColor: "#EAF2FF",
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
  },

  messageText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#172B4D",
    textAlign: "center",
  },

});