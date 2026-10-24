import React, { useEffect, useState } from "react";
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
import { getLoggedInUser } from "../lib/auth-storage";
import { updateReport } from "../lib/storage";
import { saveNotification } from "../lib/notification-storage";

type UserRole = "owner" | "finder" | "unknown";

type VerificationQuestion = {
  question: string;
  answer: string;
};

type Report = {
  id: string;
  userId?: number;
  uploadedBy?: string;
  type: "lost" | "found";
  itemName: string;
  description: string;
  location: string;
  date: string;
  time: string;
  image: string;
  verificationQuestions?: VerificationQuestion[];
  verificationPassed?: boolean;
  claimed?: boolean;
  claimedAt?: string;
  status: "Searching" | "Active" | "Matched" | "Resolved";
  createdAt: string;
};

export default function VerificationScreen() {
  const params = useLocalSearchParams();

  const [lostItem, setLostItem] =
    useState<Report | null>(() => {
      try {
        return params.lostItem
          ? JSON.parse(params.lostItem as string)
          : null;
      } catch {
        return null;
      }
    });

  const [foundItem, setFoundItem] =
    useState<Report | null>(() => {
      try {
        return params.foundItem
          ? JSON.parse(params.foundItem as string)
          : null;
      } catch {
        return null;
      }
    });

  const score = params.score
    ? Number(params.score)
    : 0;

  const [role, setRole] =
    useState<UserRole>("unknown");

  const [questions, setQuestions] =
    useState<VerificationQuestion[]>(
      () =>
        lostItem?.verificationQuestions &&
        lostItem.verificationQuestions.length > 0
          ? lostItem.verificationQuestions
          : [
              { question: "", answer: "" },
              { question: "", answer: "" },
              { question: "", answer: "" },
            ]
    );

  const [answers, setAnswers] =
    useState<string[]>([]);

  const [result, setResult] = useState<
    "none" | "passed" | "partial" | "failed"
  >("none");

  const [matchedCount, setMatchedCount] =
    useState(0);

  const [message, setMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const user = await getLoggedInUser();

      if (!user) {
        setRole("unknown");
        return;
      }

      const lostOwnerId = Number(
        lostItem?.userId
      );

      const foundOwnerId = Number(
        foundItem?.userId
      );

      if (
        lostOwnerId &&
        user.id === lostOwnerId
      ) {
        setRole("owner");
      } else if (
        foundOwnerId &&
        user.id === foundOwnerId
      ) {
        setRole("finder");
      } else {
        setRole("unknown");
      }
    };

    loadRole();
  }, []);

  useEffect(() => {
    if (role === "finder") {
      setAnswers(
        questions.map(() => "")
      );
    }
  }, [role, questions.length]);

  const updateQuestion = (
    index: number,
    value: string
  ) => {
    const updated = [...questions];

    updated[index] = {
      ...updated[index],
      question: value,
    };

    setQuestions(updated);
  };

  const updateOwnerAnswer = (
    index: number,
    value: string
  ) => {
    const updated = [...questions];

    updated[index] = {
      ...updated[index],
      answer: value,
    };

    setQuestions(updated);
  };

  const updateFinderAnswer = (
    index: number,
    value: string
  ) => {
    const updated = [...answers];

    updated[index] = value;

    setAnswers(updated);
  };

  /*
   * OWNER:
   * Save verification questions.
   */
  const saveVerificationQuestions = async () => {
    if (!lostItem) {
      setMessage(
        "Unable to load the lost item."
      );
      return;
    }

    if (role !== "owner") {
      setMessage(
        "Only the lost-item owner can edit verification questions."
      );
      return;
    }

    const incomplete = questions.some(
      (item) =>
        item.question.trim() === "" ||
        item.answer.trim() === ""
    );

    if (incomplete) {
      setMessage(
        "⚠️ Please complete all 3 questions and answers."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const updatedReport: Report = {
        ...lostItem,
        verificationQuestions:
          questions,
      };

      await updateReport(updatedReport);

      setLostItem(updatedReport);

      setMessage(
        "✅ Verification questions saved successfully."
      );
    } catch (error) {
      console.error(
        "Error saving verification questions:",
        error
      );

      setMessage(
        "Unable to save verification questions."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * FINDER:
   * Verify answers.
   */
  const handleVerification = async () => {
    if (!lostItem) {
      setMessage(
        "Unable to load the lost item details."
      );
      return;
    }

    if (!foundItem) {
      setMessage(
        "Unable to load the found item details."
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
      (answer) =>
        answer.trim() === ""
    );

    if (unanswered) {
      setMessage(
        "⚠️ Please answer all verification questions."
      );
      return;
    }

    let matched = 0;

    questions.forEach(
      (question, index) => {
        const correctAnswer =
          question.answer
            .trim()
            .toLowerCase();

        const userAnswer =
          answers[index]
            .trim()
            .toLowerCase();

        if (
          userAnswer === correctAnswer
        ) {
          matched++;
        }
      }
    );

    setMatchedCount(matched);
    setMessage("");

    /*
     * ALL ANSWERS CORRECT
     */
    if (
      matched === questions.length
    ) {
      setResult("passed");

      try {
        /*
         * Save verification status
         * into the existing lost report.
         */
        const verifiedLostItem: Report = {
          ...lostItem,
          verificationPassed: true,
        };

        await updateReport(
          verifiedLostItem
        );

        setLostItem(
          verifiedLostItem
        );

        /*
         * Notify the lost-item owner.
         */
        if (lostItem.userId) {
          await saveNotification({
            id: `notification_${Date.now()}`,
            userId: Number(
              lostItem.userId
            ),
            title:
              "Item Verification Successful",
            message:
              `Someone successfully verified the ownership details for your lost item "${lostItem.itemName}". You can now claim the item.`,
            itemName:
              lostItem.itemName,
            createdAt:
              new Date().toISOString(),
            read: false,
          });
        }

        console.log(
          "Verification passed and saved."
        );
      } catch (error) {
        console.error(
          "Error saving verification result:",
          error
        );
      }

      return;
    }

    if (matched > 0) {
      setResult("partial");
    } else {
      setResult("failed");
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!lostItem || !foundItem) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            Verification Unavailable
          </Text>

          <Text style={styles.errorText}>
            The match information could not
            be loaded.
          </Text>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() =>
              router.replace("/matches")
            }
          >
            <Text
              style={styles.doneButtonText}
            >
              Back to Matches
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={handleBack}
        >
          <Text style={styles.back}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Private Verification
        </Text>

        {role === "owner" && (
          <Text style={styles.subtitle}>
            Create private questions that only
            the genuine owner should know.
          </Text>
        )}

        {role === "finder" && (
          <Text style={styles.subtitle}>
            Answer the private questions created
            by the lost-item owner.
          </Text>
        )}

        {role === "unknown" && (
          <Text style={styles.subtitle}>
            Your role in this potential match
            could not be determined.
          </Text>
        )}

        <View style={styles.itemCard}>
          <Text style={styles.itemLabel}>
            Lost Item
          </Text>

          <Text style={styles.itemName}>
            {lostItem.itemName}
          </Text>

          <Text
            style={styles.itemDescription}
          >
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

        {/* OWNER */}
        {role === "owner" && (
          <>
            <View
              style={styles.ownerBox}
            >
              <Text
                style={styles.ownerTitle}
              >
                🔐 Create Verification Questions
              </Text>

              <Text
                style={styles.ownerText}
              >
                Create questions about details
                that are not publicly visible.
                The finder will need to answer
                these questions.
              </Text>
            </View>

            {questions.map(
              (item, index) => (
                <View
                  key={index}
                  style={
                    styles.questionCard
                  }
                >
                  <Text
                    style={
                      styles.questionNumber
                    }
                  >
                    Question {index + 1}
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter your private question"
                    placeholderTextColor="#94A3B8"
                    value={
                      item.question
                    }
                    onChangeText={(
                      value
                    ) =>
                      updateQuestion(
                        index,
                        value
                      )
                    }
                  />

                  <Text
                    style={
                      styles.answerLabel
                    }
                  >
                    Private Answer
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter the correct answer"
                    placeholderTextColor="#94A3B8"
                    value={
                      item.answer
                    }
                    onChangeText={(
                      value
                    ) =>
                      updateOwnerAnswer(
                        index,
                        value
                      )
                    }
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )
            )}

            {message !== "" && (
              <View
                style={styles.messageBox}
              >
                <Text
                  style={
                    styles.messageText
                  }
                >
                  {message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={
                styles.verifyButton
              }
              onPress={
                saveVerificationQuestions
              }
              disabled={saving}
            >
              <Text
                style={
                  styles.verifyButtonText
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Verification Questions"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* FINDER */}
        {role === "finder" && (
          <>
            <View
              style={styles.securityBox}
            >
              <Text
                style={
                  styles.securityTitle
                }
              >
                🔐 Owner Verification
              </Text>

              <Text
                style={
                  styles.securityText
                }
              >
                Answer the questions below.
                The answers are checked against
                the private information provided
                by the lost-item owner.
              </Text>
            </View>

            {questions.length > 0 ? (
              questions.map(
                (question, index) => (
                  <View
                    key={index}
                    style={
                      styles.questionCard
                    }
                  >
                    <Text
                      style={
                        styles.questionNumber
                      }
                    >
                      Question {index + 1}
                    </Text>

                    <Text
                      style={
                        styles.questionText
                      }
                    >
                      {question.question}
                    </Text>

                    <TextInput
                      style={
                        styles.input
                      }
                      placeholder="Enter your answer"
                      placeholderTextColor="#94A3B8"
                      value={
                        answers[index] ||
                        ""
                      }
                      onChangeText={(
                        value
                      ) =>
                        updateFinderAnswer(
                          index,
                          value
                        )
                      }
                      autoCapitalize="none"
                    />
                  </View>
                )
              )
            ) : (
              <View
                style={
                  styles.noQuestionsBox
                }
              >
                <Text
                  style={
                    styles.noQuestionsTitle
                  }
                >
                  No Verification Questions
                </Text>

                <Text
                  style={
                    styles.noQuestionsText
                  }
                >
                  The lost-item owner has not
                  created verification questions
                  yet.
                </Text>
              </View>
            )}

            {message !== "" && (
              <View
                style={styles.messageBox}
              >
                <Text
                  style={
                    styles.messageText
                  }
                >
                  {message}
                </Text>
              </View>
            )}

            {result === "none" &&
              questions.length > 0 && (
                <TouchableOpacity
                  style={
                    styles.verifyButton
                  }
                  onPress={
                    handleVerification
                  }
                >
                  <Text
                    style={
                      styles.verifyButtonText
                    }
                  >
                    Verify Ownership
                  </Text>
                </TouchableOpacity>
              )}

            {result === "passed" && (
              <View
                style={
                  styles.resultSuccess
                }
              >
                <Text
                  style={styles.resultIcon}
                >
                  ✅
                </Text>

                <Text
                  style={styles.resultTitle}
                >
                  Verification Passed
                </Text>

                <Text
                  style={styles.resultText}
                >
                  {matchedCount}/
                  {questions.length} private
                  answers matched.
                </Text>

                <Text
                  style={
                    styles.resultSubtext
                  }
                >
                  The answers match the
                  information provided by the
                  lost-item owner.
                </Text>

                <Text
                  style={
                    styles.notificationText
                  }
                >
                  🔔 The lost-item owner has been
                  notified.
                </Text>

                <TouchableOpacity
                  style={
                    styles.doneButton
                  }
                  onPress={() =>
                    router.replace(
                      "/matches"
                    )
                  }
                >
                  <Text
                    style={
                      styles.doneButtonText
                    }
                  >
                    Back to Matches
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {result === "partial" && (
              <View
                style={
                  styles.resultPartial
                }
              >
                <Text
                  style={styles.resultIcon}
                >
                  ⚠️
                </Text>

                <Text
                  style={styles.resultTitle}
                >
                  Partial Match
                </Text>

                <Text
                  style={styles.resultText}
                >
                  {matchedCount}/
                  {questions.length} private
                  answers matched.
                </Text>

                <Text
                  style={
                    styles.resultSubtext
                  }
                >
                  Some answers matched, but
                  ownership could not be fully
                  verified.
                </Text>

                <TouchableOpacity
                  style={
                    styles.doneButton
                  }
                  onPress={() =>
                    setResult("none")
                  }
                >
                  <Text
                    style={
                      styles.doneButtonText
                    }
                  >
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {result === "failed" && (
              <View
                style={
                  styles.resultFailed
                }
              >
                <Text
                  style={styles.resultIcon}
                >
                  ❌
                </Text>

                <Text
                  style={styles.resultTitle}
                >
                  Verification Failed
                </Text>

                <Text
                  style={styles.resultText}
                >
                  {matchedCount}/
                  {questions.length} private
                  answers matched.
                </Text>

                <Text
                  style={
                    styles.resultSubtext
                  }
                >
                  The provided answers did
                  not match the owner's private
                  information.
                </Text>

                <TouchableOpacity
                  style={
                    styles.doneButton
                  }
                  onPress={() =>
                    setResult("none")
                  }
                >
                  <Text
                    style={
                      styles.doneButtonText
                    }
                  >
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {role === "unknown" && (
          <View
            style={styles.unknownBox}
          >
            <Text
              style={
                styles.unknownTitle
              }
            >
              ⚠️ Verification Unavailable
            </Text>

            <Text
              style={
                styles.unknownText
              }
            >
              Please log in with the account that
              created either the lost or found
              report.
            </Text>
          </View>
        )}

        <View style={styles.foundInfo}>
          <Text
            style={styles.foundInfoTitle}
          >
            Found Item Report
          </Text>

          <Text
            style={styles.foundInfoText}
          >
            {foundItem.itemName}
          </Text>

          <Text
            style={styles.foundInfoText}
          >
            {foundItem.location}
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

  ownerBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  ownerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E40AF",
  },

  ownerText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginTop: 6,
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

  answerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 15,
    marginBottom: 7,
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

  unknownBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },

  unknownTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#9A3412",
  },

  unknownText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
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

  notificationText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
    textAlign: "center",
    marginTop: 12,
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

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#172B4D",
    marginBottom: 8,
  },

  errorText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },
});