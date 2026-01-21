import admin, { type ServiceAccount } from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join, isAbsolute } from "path";

let serviceAccount: ServiceAccount | undefined;

// Debug log to check if environment variables are loaded
if (process.env.NODE_ENV !== 'production') {
  console.log("Firebase Admin Init:");
  console.log("FIREBASE_SERVICE_ACCOUNT_KEY present:", !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  console.log("FIREBASE_SERVICE_ACCOUNT_PATH present:", !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
}

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          } catch (error) {
            try {
              // Retry with some common cleanup for env vars
              let jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
              
              // Remove surrounding quotes if they exist
              if ((jsonString.startsWith('"') && jsonString.endsWith('"')) || 
                  (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
                jsonString = jsonString.slice(1, -1);
              }
              
              // Handle escaped newlines that might have been double-escaped
              // This fixes the case where \n becomes \\n in the private key
              jsonString = jsonString.replace(/\\\\n/g, '\\n');
              
              serviceAccount = JSON.parse(jsonString);
            } catch (retryError) {
              console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", retryError);
            }
          }
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    const resolvedPath = isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      : join(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      
    if (existsSync(resolvedPath)) {
      const raw = readFileSync(resolvedPath, "utf-8");
      serviceAccount = JSON.parse(raw);
    } else {
      console.warn(`FIREBASE_SERVICE_ACCOUNT_PATH is set but file does not exist: ${resolvedPath}`);
    }
  } catch (error) {
    console.error(
      "Failed to read FIREBASE_SERVICE_ACCOUNT_PATH",
      error
    );
  }
}

// In development, if no service account is provided, mock the credential to avoid errors
// This allows the app to run without full admin privileges but may limit functionality
if (!serviceAccount && process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn("No Firebase Admin credentials found. Using mock credentials for development.");
  // We don't actually create a mock cert, we just let it fall back to applicationDefault
  // which might still fail if not on GCP. 
  // However, since the error is "Could not load the default credentials", we likely need SOME credential.
  // Ideally, the user should provide a service account. 
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminApp = admin.app();
const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();

export { adminApp, adminAuth, adminDb };

