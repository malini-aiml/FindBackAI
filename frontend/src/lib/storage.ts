import AsyncStorage from "@react-native-async-storage/async-storage";

export type VerificationQuestion = {
  question: string;
  answer: string;
};

export type Report = {
  id: string;

  // User who created this report
  userId?: number;
  uploadedBy?: string;

  type: "lost" | "found";

  itemName: string;
  description: string;
  location: string;
  date: string;
  time: string;
  image: string;

  // Private verification questions
  verificationQuestions?: VerificationQuestion[];

  status: "Searching" | "Active" | "Matched" | "Resolved";

  createdAt: string;
};

const REPORTS_KEY = "@findback_reports";

// ==================================================
// GET ALL REPORTS
// ==================================================

export async function getReports(): Promise<Report[]> {
  try {
    const storedReports =
      await AsyncStorage.getItem(REPORTS_KEY);

    if (!storedReports) {
      return [];
    }

    const parsedReports = JSON.parse(storedReports);

    if (!Array.isArray(parsedReports)) {
      return [];
    }

    return parsedReports as Report[];

  } catch (error) {
    console.log(
      "Error loading reports:",
      error
    );

    return [];
  }
}

// ==================================================
// SAVE NEW REPORT
// ==================================================

export async function saveReport(
  report: Report
): Promise<void> {
  try {
    const existingReports =
      await getReports();

    const updatedReports = [
      report,
      ...existingReports,
    ];

    await AsyncStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(updatedReports)
    );

  } catch (error) {
    console.log(
      "Error saving report:",
      error
    );
  }
}

// ==================================================
// UPDATE EXISTING REPORT
// ==================================================

export async function updateReport(
  updatedReport: Report
): Promise<void> {
  try {
    const existingReports =
      await getReports();

    const updatedReports =
      existingReports.map(
        (report) =>
          report.id === updatedReport.id
            ? updatedReport
            : report
      );

    await AsyncStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(updatedReports)
    );

  } catch (error) {
    console.log(
      "Error updating report:",
      error
    );
  }
}

// ==================================================
// DELETE REPORT
// ==================================================

export async function deleteReport(
  id: string
): Promise<void> {
  try {
    const existingReports =
      await getReports();

    const updatedReports =
      existingReports.filter(
        (report) =>
          report.id !== id
      );

    await AsyncStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(updatedReports)
    );

  } catch (error) {
    console.log(
      "Error deleting report:",
      error
    );
  }
}