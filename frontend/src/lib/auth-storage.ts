import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "@findback_logged_in_user";

export type LoggedInUser = {
  id: number;
  name: string;
  email: string;
};

export async function saveLoggedInUser(
  user: LoggedInUser
) {
  try {
    await AsyncStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );
  } catch (error) {
    console.error(
      "Error saving logged-in user:",
      error
    );
  }
}

export async function getLoggedInUser(): Promise<LoggedInUser | null> {
  try {
    const user = await AsyncStorage.getItem(USER_KEY);

    // No user is stored
    if (!user || user === "undefined" || user === "null") {
      return null;
    }

    try {
      const parsedUser = JSON.parse(user);

      // Make sure the stored data is actually an object
      if (
        !parsedUser ||
        typeof parsedUser !== "object"
      ) {
        await AsyncStorage.removeItem(USER_KEY);
        return null;
      }

      // Make sure required user fields exist
      if (
        typeof parsedUser.id !== "number" ||
        typeof parsedUser.name !== "string" ||
        typeof parsedUser.email !== "string"
      ) {
        await AsyncStorage.removeItem(USER_KEY);
        return null;
      }

      return parsedUser as LoggedInUser;

    } catch (parseError) {
      console.error(
        "Invalid logged-in user data. Clearing stored user.",
        parseError
      );

      // Remove corrupted data
      await AsyncStorage.removeItem(USER_KEY);

      return null;
    }

  } catch (error) {
    console.error(
      "Error loading logged-in user:",
      error
    );

    return null;
  }
}

export async function logoutUser() {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error(
      "Error logging out:",
      error
    );
  }
}