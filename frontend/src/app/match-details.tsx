import React, {
  useCallback,
  useState,
} from "react";

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { getLoggedInUser } from "../lib/auth-storage";

import {
  getReports,
  updateReport,
  Report,
} from "../lib/storage";

import { saveNotification } from "../lib/notification-storage";


// ==================================================
// TYPES
// ==================================================

type UserRole = "owner" | "finder" | "unknown";

type ContactUser = {
  id: number;
  name: string;
  email: string;
};


// ==================================================
// API URL
// ==================================================

const API_URL = "http://127.0.0.1:8000";


// ==================================================
// MATCH DETAILS SCREEN
// ==================================================

export default function MatchDetailsScreen() {

  const params = useLocalSearchParams();

  const [currentUserId, setCurrentUserId] =
    useState<number | null>(null);

  const [role, setRole] =
    useState<UserRole>("unknown");

  const [lostItem, setLostItem] =
    useState<Report | null>(null);

  const [foundItem, setFoundItem] =
    useState<Report | null>(null);

  const [claimed, setClaimed] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [contactUser, setContactUser] =
    useState<ContactUser | null>(null);

  const [contactLoading, setContactLoading] =
    useState(false);

  const score =
    params.score
      ? Number(params.score)
      : 0;


  // ==================================================
  // LOAD MATCH DETAILS WHEN SCREEN GETS FOCUS
  // ==================================================

  useFocusEffect(
    useCallback(() => {

      loadMatchDetails();

    }, [])
  );


  // ==================================================
  // LOAD MATCH DETAILS
  // ==================================================

  const loadMatchDetails = async () => {

    try {

      setLoading(true);

      const loggedInUser =
        await getLoggedInUser();


      // ------------------------------------------------
      // USER NOT LOGGED IN
      // ------------------------------------------------

      if (!loggedInUser) {

        setCurrentUserId(null);
        setRole("unknown");
        setLoading(false);

        return;
      }


      setCurrentUserId(loggedInUser.id);


      // ------------------------------------------------
      // LOAD REPORTS
      // ------------------------------------------------

      const reports =
        await getReports();


      let lostId: string | null = null;
      let foundId: string | null = null;


      // ------------------------------------------------
      // PARSE ROUTE PARAMETERS
      // ------------------------------------------------

      try {

        const parsedLost =
          params.lostItem
            ? JSON.parse(
                params.lostItem as string
              )
            : null;

        const parsedFound =
          params.foundItem
            ? JSON.parse(
                params.foundItem as string
              )
            : null;


        lostId =
          parsedLost?.id
            ? String(parsedLost.id)
            : null;

        foundId =
          parsedFound?.id
            ? String(parsedFound.id)
            : null;

      } catch (error) {

        console.error(
          "Error parsing match parameters:",
          error
        );

      }


      // ------------------------------------------------
      // FIND LATEST REPORTS
      // ------------------------------------------------

      const savedLostItem =
        reports.find(
          (report) =>
            String(report.id) ===
            String(lostId)
        ) || null;


      const savedFoundItem =
        reports.find(
          (report) =>
            String(report.id) ===
            String(foundId)
        ) || null;


      setLostItem(savedLostItem);
      setFoundItem(savedFoundItem);


      // ------------------------------------------------
      // DETERMINE USER ROLE
      // ------------------------------------------------

      const lostOwnerId =
        Number(savedLostItem?.userId);

      const foundOwnerId =
        Number(savedFoundItem?.userId);


      if (
        loggedInUser.id ===
        lostOwnerId
      ) {

        setRole("owner");

      } else if (
        loggedInUser.id ===
        foundOwnerId
      ) {

        setRole("finder");

      } else {

        setRole("unknown");

      }


      // ------------------------------------------------
      // CHECK CLAIM STATUS
      // ------------------------------------------------

      if (
        savedLostItem?.status ===
          "Resolved" ||
        savedFoundItem?.status ===
          "Resolved"
      ) {

        setClaimed(true);

      } else {

        setClaimed(false);

      }


      // ------------------------------------------------
      // CONTACT DETAILS
      //
      // Only load after successful verification.
      // ------------------------------------------------

      if (
        savedLostItem?.verificationPassed ===
        true
      ) {

        await loadContactDetails(
          loggedInUser.id,
          savedLostItem,
          savedFoundItem
        );

      } else {

        setContactUser(null);

      }

    } catch (error) {

      console.error(
        "Error loading match details:",
        error
      );

    } finally {

      setLoading(false);

    }
  };


  // ==================================================
  // LOAD CONTACT DETAILS
  // ==================================================

  const loadContactDetails = async (
    loggedInUserId: number,
    lost: Report,
    found: Report
  ) => {

    try {

      setContactLoading(true);


      let contactUserId: number | null =
        null;


      // ------------------------------------------------
      // OWNER NEEDS FINDER CONTACT
      // ------------------------------------------------

      if (
        loggedInUserId ===
        Number(lost.userId)
      ) {

        contactUserId =
          found.userId
            ? Number(found.userId)
            : null;

      }


      // ------------------------------------------------
      // FINDER NEEDS OWNER CONTACT
      // ------------------------------------------------

      else if (
        loggedInUserId ===
        Number(found.userId)
      ) {

        contactUserId =
          lost.userId
            ? Number(lost.userId)
            : null;

      }


      if (!contactUserId) {

        setContactUser(null);
        return;

      }


      // ------------------------------------------------
      // FETCH CONTACT FROM BACKEND
      // ------------------------------------------------

      const response =
        await fetch(
          `${API_URL}/users/${contactUserId}/contact`
        );


      if (!response.ok) {

        throw new Error(
          `Contact request failed: ${response.status}`
        );

      }


      const data =
        await response.json();


      if (
        data &&
        data.user
      ) {

        setContactUser({
          id: Number(data.user.id),
          name: String(data.user.name),
          email: String(data.user.email),
        });

      } else {

        setContactUser(null);

      }

    } catch (error) {

      console.error(
        "Error loading contact details:",
        error
      );

      setContactUser(null);

    } finally {

      setContactLoading(false);

    }
  };


  // ==================================================
  // LOADING SCREEN
  // ==================================================

  if (loading) {

    return (
      <SafeAreaView
        style={styles.container}
      >

        <View
          style={styles.centerContainer}
        >

          <Text
            style={styles.loadingText}
          >
            Loading match details...
          </Text>

        </View>

      </SafeAreaView>
    );

  }


  // ==================================================
  // MATCH NOT FOUND
  // ==================================================

  if (
    !lostItem ||
    !foundItem
  ) {

    return (
      <SafeAreaView
        style={styles.container}
      >

        <View
          style={styles.errorContainer}
        >

          <Text
            style={styles.errorTitle}
          >
            Match Not Found
          </Text>


          <Text
            style={styles.errorText}
          >
            The selected match details could not
            be loaded.
          </Text>


          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace("/matches")
            }
          >

            <Text
              style={styles.backButtonText}
            >
              Back to Matches
            </Text>

          </TouchableOpacity>

        </View>

      </SafeAreaView>
    );

  }


  // ==================================================
  // VERIFICATION STATUS
  // ==================================================

  const verificationPassed =
    lostItem.verificationPassed === true;


  // ==================================================
  // VERIFICATION BUTTON
  // ==================================================

  const handleVerification = () => {

    if (role === "unknown") {
      return;
    }


    router.push({
      pathname: "/verification",

      params: {
        lostItem:
          JSON.stringify(lostItem),

        foundItem:
          JSON.stringify(foundItem),

        score:
          score.toString(),

        role,
      },
    });

  };


  // ==================================================
  // CLAIM ITEM
  // ==================================================

  const handleClaimItem = async () => {

    if (role !== "owner") {
      return;
    }


    if (!verificationPassed) {

      Alert.alert(
        "Verification Required",
        "The finder must successfully answer the verification questions before you can claim the item."
      );

      return;
    }


    Alert.alert(
      "Claim Missing Item",

      "Have you confirmed that this is your missing item?",

      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Yes, Claim",

          onPress: async () => {

            try {

              const claimedAt =
                new Date().toISOString();


              const updatedLostItem:
                Report = {

                ...lostItem,

                status: "Resolved",

                claimedAt,

                claimedByUserId:
                  currentUserId ??
                  undefined,

              };


              const updatedFoundItem:
                Report = {

                ...foundItem,

                status: "Resolved",

                claimedAt,

                claimedByUserId:
                  currentUserId ??
                  undefined,

              };


              // ------------------------------------------------
              // UPDATE LOCAL REPORTS
              // ------------------------------------------------

              await updateReport(
                updatedLostItem
              );

              await updateReport(
                updatedFoundItem
              );


              // ------------------------------------------------
              // NOTIFY FINDER
              // ------------------------------------------------

              if (
                foundItem.userId
              ) {

                await saveNotification({

                  id:
                    `notification_${Date.now()}`,

                  userId:
                    Number(foundItem.userId),

                  title:
                    "Item Claimed",

                  message:
                    `The owner has claimed the matched item "${lostItem.itemName}".`,

                  itemName:
                    lostItem.itemName,

                  createdAt:
                    claimedAt,

                  read: false,

                });

              }


              // ------------------------------------------------
              // UPDATE SCREEN
              // ------------------------------------------------

              setLostItem(
                updatedLostItem
              );

              setFoundItem(
                updatedFoundItem
              );

              setClaimed(true);


              // ------------------------------------------------
              // KEEP CONTACT DETAILS AVAILABLE
              // ------------------------------------------------

              await loadContactDetails(
                currentUserId ??
                  Number(lostItem.userId),

                updatedLostItem,

                updatedFoundItem
              );


              Alert.alert(
                "Item Claimed Successfully",

                `You have successfully claimed "${lostItem.itemName}".`,

                [
                  {
                    text: "OK",
                  },
                ]
              );

            } catch (error) {

              console.error(
                "Error claiming item:",
                error
              );


              Alert.alert(
                "Error",
                "Unable to complete the claim. Please try again."
              );

            }

          },
        },
      ]
    );

  };


  // ==================================================
  // UI
  // ==================================================

  return (

    <SafeAreaView
      style={styles.container}
    >

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >


        {/* BACK */}

        <TouchableOpacity
          onPress={() =>
            router.replace("/matches")
          }
        >

          <Text
            style={styles.back}
          >
            ← Back to Matches
          </Text>

        </TouchableOpacity>


        {/* TITLE */}

        <Text
          style={styles.title}
        >
          Match Details
        </Text>


        <Text
          style={styles.subtitle}
        >
          Review the potential match before
          verification.
        </Text>


        {/* MATCH SCORE */}

        <View
          style={styles.scoreCard}
        >

          <Text
            style={styles.scoreLabel}
          >
            Potential Match Score
          </Text>


          <Text
            style={styles.score}
          >
            {score}%
          </Text>


          <Text
            style={styles.scoreInfo}
          >
            This score represents the similarity
            between the two reports.
          </Text>

        </View>


        {/* CLAIMED STATUS */}

        {claimed && (

          <View
            style={styles.claimedBox}
          >

            <Text
              style={styles.claimedTitle}
            >
              ✓ Item Successfully Claimed
            </Text>


            <Text
              style={styles.claimedText}
            >
              This match has been resolved. The
              lost item owner has completed the
              verification and claim process.
            </Text>

          </View>

        )}


        {/* ==================================================
            CONTACT DETAILS
            ================================================== */}

        {verificationPassed && (

          <View
            style={styles.contactBox}
          >

            <Text
              style={styles.contactTitle}
            >
              📞 Contact Details
            </Text>


            <Text
              style={styles.contactSubtitle}
            >
              Verification was successful. You can
              now contact the other person to recover
              the item.
            </Text>


            {contactLoading ? (

              <Text
                style={styles.contactLoading}
              >
                Loading contact details...
              </Text>

            ) : contactUser ? (

              <View
                style={styles.contactCard}
              >

                <View
                  style={styles.contactRow}
                >

                  <Text
                    style={styles.contactLabel}
                  >
                    Name
                  </Text>

                  <Text
                    style={styles.contactValue}
                  >
                    {contactUser.name}
                  </Text>

                </View>


                <View
                  style={styles.contactDivider}
                />


                <View
                  style={styles.contactRow}
                >

                  <Text
                    style={styles.contactLabel}
                  >
                    Email
                  </Text>

                  <Text
                    style={styles.contactValue}
                  >
                    {contactUser.email}
                  </Text>

                </View>


                <Text
                  style={styles.contactNote}
                >
                  Use this contact information to
                  coordinate the safe recovery of the
                  missing item.
                </Text>

              </View>

            ) : (

              <Text
                style={styles.contactError}
              >
                Contact details could not be loaded.
                Please check that the backend server
                is running.
              </Text>

            )}

          </View>

        )}


        {/* LOST ITEM */}

        <View
          style={styles.card}
        >

          <View
            style={styles.cardHeader}
          >

            <Text
              style={styles.sectionTitle}
            >
              Lost Item
            </Text>


            <View
              style={styles.lostBadge}
            >

              <Text
                style={styles.badgeText}
              >
                LOST
              </Text>

            </View>

          </View>


          {lostItem.image ? (

            <Image
              source={{
                uri: lostItem.image,
              }}
              style={styles.itemImage}
            />

          ) : null}


          <Text
            style={styles.itemName}
          >
            {lostItem.itemName}
          </Text>


          <Text
            style={styles.description}
          >
            {lostItem.description}
          </Text>


          <Text
            style={styles.info}
          >
            📍 {lostItem.location}
          </Text>


          <Text
            style={styles.info}
          >
            📅 {lostItem.date} • ⏰{" "}
            {lostItem.time}
          </Text>


          {lostItem.uploadedBy && (

            <Text
              style={styles.uploadedBy}
            >
              Uploaded by:{" "}
              {lostItem.uploadedBy}
            </Text>

          )}


          <View
            style={styles.statusRow}
          >

            <Text
              style={styles.statusLabel}
            >
              Status:
            </Text>


            <Text
              style={[
                styles.statusValue,

                lostItem.status ===
                  "Resolved" &&
                  styles.resolvedStatus,
              ]}
            >
              {lostItem.status}
            </Text>

          </View>

        </View>


        {/* FOUND ITEM */}

        <View
          style={styles.card}
        >

          <View
            style={styles.cardHeader}
          >

            <Text
              style={styles.sectionTitle}
            >
              Found Item
            </Text>


            <View
              style={styles.foundBadge}
            >

              <Text
                style={styles.badgeText}
              >
                FOUND
              </Text>

            </View>

          </View>


          {foundItem.image ? (

            <Image
              source={{
                uri: foundItem.image,
              }}
              style={styles.itemImage}
            />

          ) : null}


          <Text
            style={styles.itemName}
          >
            {foundItem.itemName}
          </Text>


          <Text
            style={styles.description}
          >
            {foundItem.description}
          </Text>


          <Text
            style={styles.info}
          >
            📍 {foundItem.location}
          </Text>


          <Text
            style={styles.info}
          >
            📅 {foundItem.date} • ⏰{" "}
            {foundItem.time}
          </Text>


          {foundItem.uploadedBy && (

            <Text
              style={styles.uploadedBy}
            >
              Uploaded by:{" "}
              {foundItem.uploadedBy}
            </Text>

          )}


          <View
            style={styles.statusRow}
          >

            <Text
              style={styles.statusLabel}
            >
              Status:
            </Text>


            <Text
              style={[
                styles.statusValue,

                foundItem.status ===
                  "Resolved" &&
                  styles.resolvedStatus,
              ]}
            >
              {foundItem.status}
            </Text>

          </View>

        </View>


        {/* OWNER MESSAGE */}

        {role === "owner" &&
          !claimed && (

            <View
              style={styles.ownerBox}
            >

              <Text
                style={styles.ownerTitle}
              >
                🔐 You are the Lost-Item Owner
              </Text>


              <Text
                style={styles.ownerText}
              >
                Create private verification questions.
                The finder must answer them correctly
                before you can claim your missing item.
              </Text>

            </View>

          )}


        {/* FINDER MESSAGE */}

        {role === "finder" &&
          !claimed && (

            <View
              style={styles.finderBox}
            >

              <Text
                style={styles.finderTitle}
              >
                🔐 You are the Finder
              </Text>


              <Text
                style={styles.finderText}
              >
                The lost-item owner will verify your
                knowledge of the item using private
                verification questions.
              </Text>

            </View>

          )}


        {/* UNKNOWN USER */}

        {role === "unknown" && (

          <View
            style={styles.unknownBox}
          >

            <Text
              style={styles.unknownTitle}
            >
              ⚠️ Unable to Determine Role
            </Text>


            <Text
              style={styles.unknownText}
            >
              Please make sure you are logged in
              with the account that created one of
              these reports.
            </Text>

          </View>

        )}


        {/* VERIFICATION PASSED */}

        {role === "owner" &&
          verificationPassed &&
          !claimed && (

            <View
              style={styles.verifiedBox}
            >

              <Text
                style={styles.verifiedTitle}
              >
                ✓ Verification Successful
              </Text>


              <Text
                style={styles.verifiedText}
              >
                The finder successfully answered the
                private verification questions. You
                can now contact the finder and claim
                your missing item.
              </Text>

            </View>

          )}


        {/* OWNER BUTTON */}

        {role === "owner" &&
          !verificationPassed &&
          !claimed && (

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerification}
            >

              <Text
                style={styles.verifyButtonText}
              >
                Create Verification Question
              </Text>

            </TouchableOpacity>

          )}


        {/* OWNER CLAIM BUTTON */}

        {role === "owner" &&
          verificationPassed &&
          !claimed && (

            <TouchableOpacity
              style={styles.claimButton}
              onPress={handleClaimItem}
            >

              <Text
                style={styles.claimButtonText}
              >
                ✓ Claim Missing Item
              </Text>

            </TouchableOpacity>

          )}


        {/* FINDER BUTTON */}

        {role === "finder" &&
          !claimed && (

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerification}
            >

              <Text
                style={styles.verifyButtonText}
              >
                Answer Verification Questions
              </Text>

            </TouchableOpacity>

          )}


        {/* RESOLVED */}

        {claimed && (

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

        )}


        {/* UNKNOWN */}

        {role === "unknown" &&
          !claimed && (

            <TouchableOpacity
              style={styles.disabledButton}
              disabled
            >

              <Text
                style={styles.disabledButtonText}
              >
                Verification Unavailable
              </Text>

            </TouchableOpacity>

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
    padding: 20,
    paddingBottom: 40,
  },

  back: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 18,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#172B4D",
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 22,
  },

  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  scoreLabel: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },

  score: {
    fontSize: 42,
    fontWeight: "800",
    color: "#2563EB",
    marginTop: 6,
  },

  scoreInfo: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },


  // ==================================================
  // CONTACT STYLES
  // ==================================================

  contactBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#93C5FD",
  },

  contactTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E40AF",
    marginBottom: 6,
  },

  contactSubtitle: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
    marginBottom: 14,
  },

  contactLoading: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
  },

  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  contactRow: {
    paddingVertical: 4,
  },

  contactLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 4,
  },

  contactValue: {
    fontSize: 16,
    color: "#172B4D",
    fontWeight: "700",
  },

  contactDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },

  contactNote: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 12,
  },

  contactError: {
    fontSize: 14,
    color: "#B91C1C",
    lineHeight: 21,
  },


  // ==================================================
  // CLAIMED
  // ==================================================

  claimedBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },

  claimedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 8,
  },

  claimedText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },


  // ==================================================
  // ITEM CARD
  // ==================================================

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#172B4D",
  },

  lostBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  foundBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },

  itemImage: {
    width: "100%",
    height: 190,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: "#E2E8F0",
  },

  itemName: {
    fontSize: 21,
    fontWeight: "800",
    color: "#172B4D",
    marginBottom: 7,
  },

  description: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 12,
  },

  info: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 5,
  },

  uploadedBy: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
    marginTop: 10,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  statusLabel: {
    fontSize: 14,
    color: "#64748B",
    marginRight: 6,
  },

  statusValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },

  resolvedStatus: {
    color: "#16A34A",
  },


  // ==================================================
  // OWNER
  // ==================================================

  ownerBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 18,
  },

  ownerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E40AF",
    marginBottom: 8,
  },

  ownerText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },


  // ==================================================
  // FINDER
  // ==================================================

  finderBox: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 18,
  },

  finderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 8,
  },

  finderText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },


  // ==================================================
  // UNKNOWN
  // ==================================================

  unknownBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 18,
  },

  unknownTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#9A3412",
    marginBottom: 8,
  },

  unknownText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },


  // ==================================================
  // VERIFIED
  // ==================================================

  verifiedBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#86EFAC",
    marginBottom: 18,
  },

  verifiedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 8,
  },

  verifiedText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },


  // ==================================================
  // BUTTONS
  // ==================================================

  verifyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },

  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  claimButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },

  claimButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  doneButton: {
    backgroundColor: "#172B4D",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  disabledButton: {
    backgroundColor: "#CBD5E1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  disabledButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "800",
  },


  // ==================================================
  // ERROR / LOADING
  // ==================================================

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

  backButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
  },

  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontSize: 16,
    color: "#64748B",
  },

});