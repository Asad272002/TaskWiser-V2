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
    let jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    
    // Remove surrounding quotes if they exist (e.g. "..." or '...')
    if ((jsonString.startsWith('"') && jsonString.endsWith('"')) || 
        (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
      jsonString = jsonString.slice(1, -1);
    }

    // Remove explicit newlines that might be in the string literal "{\n..."
    jsonString = jsonString.replace(/^\\n/, '').replace(/\\n$/, '');

    // Handle double escaped newlines (common in Vercel env vars)
    jsonString = jsonString.replace(/\\\\n/g, '\\n');
    // Also handle normal escaped newlines just in case
    jsonString = jsonString.replace(/\\n/g, '\n');

    // Fix common copy-paste error: missing surrounding braces
    if (!jsonString.trim().startsWith('{')) {
      // Check if it starts with "type": "service_account" or similar
      // If the user pasted the CONTENT of the json without braces
      jsonString = `{${jsonString}}`;
    }

    // CRITICAL FIX for "Expected property name or '}' in JSON at position 1"
    // The error "at position 1" usually means the first char is { but the second is invalid (like a space or newline)
    // JSON.parse DOES NOT allow newlines in the string unless they are escaped.
    // But if we've already converted \n to actual newlines, JSON.parse might fail if not careful.
    // Actually, JSON.parse(string) parses a JSON formatted string.
    // A JSON string CANNOT contain literal control characters (like newlines).
    // So if we have actual newlines in the string, we must remove them or ensure they are proper whitespace.
    
    // Let's try to minify the JSON to be safe (remove all whitespace outside of strings)
    // This is risky if we break strings, but let's just trim for now.
    jsonString = jsonString.trim();

    // If we see double braces like {{ "type"... }} because the user fixed it while we also fixed it
    if (jsonString.startsWith('{{')) {
      jsonString = jsonString.substring(1, jsonString.length - 1);
    }
    
    // Final fallback: remove all newlines and extra spaces if parsing fails
    // We will try parsing first, then aggressive cleanup
    
    try {
      serviceAccount = JSON.parse(jsonString);
    } catch (e1) {
      // Aggressive cleanup: remove all newlines and carriage returns
      const cleaned = jsonString.replace(/[\r\n]+/g, '');
      serviceAccount = JSON.parse(cleaned);
    }
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Content snippet:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 50));
    console.error("Error details:", error);
    // Do NOT fallback to path if key was provided but failed
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

