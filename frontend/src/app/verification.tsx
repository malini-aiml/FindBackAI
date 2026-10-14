import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

type VerificationQuestion = {
  question: string;
  answer: string;
};

type Report = {
  id: string;
  type: "lost" | "found";
  itemName: string;
  description: string;
  location: string;
  date: string;
  time: string;
  image: string;
  verificationQuestions?: VerificationQuestion[];
  status: "Searching" | "Active" | "Matched" | "Resolved";
  createdAt: string;
};

export default function VerificationScreen() {
  const params = useLocalSearchParams();

  const [lostItem, setLostItem] = useState<Report | null>(() => {
    try {
      return params.lostItem
        ? JSON.parse(params.lostItem as string)
        : null;
    } catch {
      return null;
    }
  });

  const [foundItem, setFoundItem] = useState<Report | null>(() => {
    try {
      return params.foundItem
        ? JSON.parse(params.foundItem as string)
        : null;
    } catch {
      return null;
    }
  });

  const score = params.score ? Number(params.score) : 0;

  const questions =
    lostItem?.verificationQuestions || [];

  const [answers, setAnswers] = useState<string[]>(
    questions.map(() => "")
  );

  const [result, setResult] = useState<
    "none" | "passed" | "partial" | "failed"
  >("none");

  const [matchedCount, setMatchedCount] = useState(0);

  const [message, setMessage] = useState("");

  const updateAnswer = (
    index: number,
    value: string
  ) => {
    const updatedAnswers = [...answers];

    updatedAnswers[index] = value;

    setAnswers(updatedAnswers);
  };

  const handleVerification = () => {
    if (!lostItem) {
      setMessage(
        "Unable to load the lost item details."
      );
      return;
    }

    if (questions.length === 0) {
      setMessage(
        "This lost item does not have private verification questions."
      );
      return;
    }

    const unanswered = answers.some(
      (answer) => answer.trim() === ""
    );

    if (unanswered) {
      setMessage(
        "⚠️ Please answer all verification questions."
      );
      return;
    }

    let matched = 0;

    questions.forEach((question, index) => {
      const correctAnswer =
        question.answer.trim().toLowerCase();

      const userAnswer =
        answers[index].trim().toLowerCase();

      if (userAnswer === correctAnswer) {
        matched++;
      }
    });

    setMatchedCount(matched);
    setMessage("");
    
    if (matched === questions.length) {
      setResult("passed");
    } else if (matched > 0) {
      setResult("partial");
    } else {
      setResult("failed");
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Private Verification
        </Text>

        <Text style={styles.subtitle}>
          Answer the questions created by the lost-item
          owner.
        </Text>

        {lostItem && (
          <View style={styles.itemCard}>
            <Text style={styles.itemLabel}>
              Lost Item
            </Text>

            <Text style={styles.itemName}>
              {lostItem.itemName}
            </Text>

            <Text style={styles.itemDescription}>
              {lostItem.description}
            </Text>

            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>
                AI Match Score
              </Text>

              <Text style={styles.score}>
                {score}%
              </Text>
            </View>
          </View>
        )}

        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>
            🔐 Owner Verification
          </Text>

          <Text style={styles.securityText}>
            These questions contain private information
            that should only be known by the genuine
            owner.
          </Text>
        </View>

        {questions.length > 0 ? (
          questions.map((question, index) => (
            <View
              key={index}
              style={styles.questionCard}
            >
              <Text style={styles.questionNumber}>
                Question {index + 1}
              </Text>

              <Text style={styles.questionText}>
                {question.question}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your answer"
                placeholderTextColor="#94A3B8"
                value={answers[index] || ""}
                onChangeText={(value) =>
                  updateAnswer(index, value)
                }
                autoCapitalize="none"
              />
            </View>
          ))
        ) : (
          <View style={styles.noQuestionsBox}>
            <Text style={styles.noQuestionsTitle}>
              No Verification Questions
            </Text>

            <Text style={styles.noQuestionsText}>
              This report does not contain private
              verification questions.
            </Text>
          </View>
        )}

        {message !== "" && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              {message}
            </Text>
          </View>
        )}

        {result === "none" && questions.length > 0 && (
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerification}
          >
            <Text style={styles.verifyButtonText}>
              Verify Ownership
            </Text>
          </TouchableOpacity>
        )}

        {result === "passed" && (
          <View style={styles.resultSuccess}>
            <Text style={styles.resultIcon}>
              ✅
            </Text>

            <Text style={styles.resultTitle}>
              Verification Passed
            </Text>

            <Text style={styles.resultText}>
              {matchedCount}/{questions.length} private
              answers matched.
            </Text>

            <Text style={styles.resultSubtext}>
              The answers match the information provided
              by the lost-item owner.
            </Text>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => router.replace("/matches")}
            >
              <Text style={styles.doneButtonText}>
                Back to Matches
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {result === "partial" && (
          <View style={styles.resultPartial}>
            <Text style={styles.resultIcon}>
              ⚠️
            </Text>

            <Text style={styles.resultTitle}>
              Partial Match
            </Text>

            <Text style={styles.resultText}>
              {matchedCount}/{questions.length} private
              answers matched.
            </Text>

            <Text style={styles.resultSubtext}>
              Some answers matched, but ownership could
              not be fully verified. Further review may
              be required.
            </Text>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setResult("none")}
            >
              <Text style={styles.doneButtonText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {result === "failed" && (
          <View style={styles.resultFailed}>
            <Text style={styles.resultIcon}>
              ❌
            </Text>

            <Text style={styles.resultTitle}>
              Verification Failed
            </Text>

            <Text style={styles.resultText}>
              {matchedCount}/{questions.length} private
              answers matched.
            </Text>

            <Text style={styles.resultSubtext}>
              The provided answers did not match the
              owner's private information.
            </Text>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setResult("none")}
            >
              <Text style={styles.doneButtonText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {foundItem && (
          <View style={styles.foundInfo}>
            <Text style={styles.foundInfoTitle}>
              Found Item Report
            </Text>

            <Text style={styles.foundInfoText}>
              {foundItem.itemName}
            </Text>

            <Text style={styles.foundInfoText}>
              {foundItem.location}
            </Text>
          </View>
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
    paddingBottom: 50,
  },

  back: {
    fontSize: 16,
    color: "#2563EB",
    marginBottom: 25,
  },

  title: {
    fontSize: 29,
    fontWeight: "800",
    color: "#172B4D",
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 22,
  },

  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D9E1EC",
  },

  itemLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  itemName: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172B4D",
    marginTop: 5,
  },

  itemDescription: {
    fontSize: 14,
    color: "#475569",
    marginTop: 7,
    lineHeight: 20,
  },

  scoreBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  scoreLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },

  score: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
  },

  securityBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  securityTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E40AF",
  },

  securityText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginTop: 6,
  },

  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#D9E1EC",
  },

  questionNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
    marginBottom: 8,
  },

  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#172B4D",
    lineHeight: 22,
    marginBottom: 13,
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#172B4D",
  },

  verifyButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    padding: 17,
    alignItems: "center",
    marginTop: 25,
  },

  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  messageBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },

  messageText: {
    color: "#9A3412",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  noQuestionsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#D9E1EC",
  },

  noQuestionsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172B4D",
  },

  noQuestionsText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 7,
  },

  resultSuccess: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 20,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
  },

  resultPartial: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 20,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
  },

  resultFailed: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 20,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
  },

  resultIcon: {
    fontSize: 35,
    marginBottom: 8,
  },

  resultTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172B4D",
  },

  resultText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
  },

  resultSubtext: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  doneButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 18,
  },

  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  foundInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#D9E1EC",
  },

  foundInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  foundInfoText: {
    fontSize: 15,
    color: "#172B4D",
    fontWeight: "600",
    marginTop: 5,
  },
});