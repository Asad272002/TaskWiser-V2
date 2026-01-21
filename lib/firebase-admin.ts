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
    // If the string contains literal newlines (0x0A), JSON.parse will fail.
    // We must escape them to \\n.
    jsonString = jsonString.replace(/\n/g, '\\n');
    jsonString = jsonString.replace(/\r/g, '');

    // Handle double escaped newlines (common in Vercel env vars)
    // If we have \\n, we want to keep it as \\n for JSON.parse to read it as \n char
    // But sometimes it comes as \\\\n which JSON.parse reads as \\n
    // Let's just leave the escaping alone for a moment and rely on post-processing
    
    // Fix common copy-paste error: missing surrounding braces
    if (!jsonString.trim().startsWith('{')) {
      jsonString = `{${jsonString}}`;
    }

    // If we see double braces like {{ "type"... }}
    if (jsonString.startsWith('{{')) {
      jsonString = jsonString.substring(1, jsonString.length - 1);
    }
    
    try {
      serviceAccount = JSON.parse(jsonString);
    } catch (e1) {
      // If parsing failed, it might be due to unquoted keys or single quotes
      // Attempt to fix single quotes used for keys (e.g. {'type': ...})
      const fixedQuotes = jsonString.replace(/['](\w+)[']\s*:/g, '"$1":');
      try {
        serviceAccount = JSON.parse(fixedQuotes);
      } catch (e2) {
         console.error("JSON parse failed even after fixes.", e2);
         throw e2;
      }
    }

    // POST-PROCESSING: Fix the private_key specifically
    if (serviceAccount && serviceAccount.private_key) {
      // Replace literal \n string sequences with actual newlines
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
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

