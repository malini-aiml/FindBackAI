import AsyncStorage from "@react-native-async-storage/async-storage";

export type VerificationQuestion = {
  question: string;
  answer: string;
};

export type Report = {
  id: string;
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

export async function getReports(): Promise<Report[]> {
  try {
    const storedReports = await AsyncStorage.getItem(REPORTS_KEY);

    if (storedReports) {
      return JSON.parse(storedReports);
    }

    return [];
  } catch (error) {
    console.log("Error loading reports:", error);
    return [];
  }
}

export async function saveReport(
  report: Report
): Promise<void> {
  try {
    const existingReports = await getReports();

    const updatedReports = [
      report,
      ...existingReports,
    ];

    await AsyncStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(updatedReports)
    );
  } catch (error) {
    console.log("Error saving report:", error);
  }
}

export async function deleteReport(
  id: string
): Promise<void> {
  try {
    const existingReports = await getReports();

    const updatedReports = existingReports.filter(
      (report) => report.id !== id
    );

    await AsyncStorage.setItem(
      REPORTS_KEY,
      JSON.stringify(updatedReports)
    );
  } catch (error) {
    console.log("Error deleting report:", error);
  }
}