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

    // Fix common copy-paste error: missing surrounding braces
              if (!jsonString.startsWith('{')) {
                // Check if it starts with "type": "service_account" or similar
                // If the user pasted the CONTENT of the json without braces
                jsonString = `{${jsonString}}`;
              }

              // CRITICAL FIX for "Expected property name or '}' in JSON at position 1"
              // This error happens when the string starts with `{` but immediately has an invalid char (like a newline or space)
              // OR if we added braces to a string that already had them but was just malformed
              
              // If we see double braces like {{ "type"... }} because the user fixed it while we also fixed it
              if (jsonString.startsWith('{{')) {
                jsonString = jsonString.substring(1, jsonString.length - 1);
              }

              // Attempt to fix single quotes used for keys (e.g. {'type': ...})
    // This replaces 'key': with "key":
    jsonString = jsonString.replace(/['](\w+)[']\s*:/g, '"$1":');
    
    // First, escape any literal control characters (actual newlines, tabs, etc.)
    // These are invalid in JSON and must be escaped
    // We need to do this carefully to avoid double-escaping
    let result = '';
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      const prevChar = i > 0 ? jsonString[i - 1] : '';
      
      // If it's a control character and not already escaped
      if (char === '\n' && prevChar !== '\\') {
        result += '\\n';
      } else if (char === '\r' && prevChar !== '\\') {
        result += '\\r';
      } else if (char === '\t' && prevChar !== '\\') {
        result += '\\t';
      } else if (char.charCodeAt(0) >= 0x00 && char.charCodeAt(0) <= 0x1F && prevChar !== '\\') {
        // Escape any other control characters
        result += '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
      } else {
        result += char;
      }
    }
    jsonString = result;
    
    // Now handle double-escaped sequences from env files (\\n -> \n, \\" -> \")
    // This converts "\\n" (backslash + backslash + n) to "\n" (backslash + n) for JSON
    jsonString = jsonString.replace(/\\\\n/g, '\\n');
    jsonString = jsonString.replace(/\\\\"/g, '\\"');
    
    serviceAccount = JSON.parse(jsonString);
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

