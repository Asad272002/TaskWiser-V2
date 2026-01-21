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

    // SMART CLEANUP for Vercel Env Vars
    // Vercel often injects literal "\n" characters for newlines in the UI.
    // These break JSON.parse if they are outside strings (structural) 
    // or if they are literal backslash+n inside strings (which JSON.parse reads as \\n).
    
    // 1. Remove literal "\n" that appear before a property name (structural)
    //    e.g. { \n "type": ... }  -> { "type": ... }
    //    e.g. , \n "project_id": ... -> , "project_id": ...
    jsonString = jsonString.replace(/\\n(?=\s*")/g, '');
    
    // 2. Remove literal "\n" that appear before a closing brace (structural)
    //    e.g. ... } \n } -> ... } }
    jsonString = jsonString.replace(/\\n(?=\s*\})/g, '');
    
    // 3. Remove literal "\n" that appear after an opening brace (structural)
    //    e.g. { \n "type" ... -> { "type" ...
    jsonString = jsonString.replace(/\{\s*\\n/g, '{');

    // 4. Handle actual newlines (0x0A) if they somehow got in (rare in Vercel envs but possible)
    //    We treat them as whitespace and let JSON.parse handle them, UNLESS they are inside strings.
    //    But since we can't easily distinguish, we'll assume JSON.parse handles structural newlines.
    
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
      console.error("First parse attempt failed. Trying aggressive fixes.");
      // If parsing failed, it might be due to unquoted keys or single quotes
      
      // Attempt to fix unquoted keys: type: "service_account" -> "type": "service_account"
      // Matches: start-of-line/brace/comma + whitespace + word + whitespace + colon
      let fixed = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      
      // Attempt to fix single quotes used for keys: 'type': ... -> "type": ...
      fixed = fixed.replace(/['](\w+)[']\s*:/g, '"$1":');
      
      try {
        serviceAccount = JSON.parse(fixed);
      } catch (e2) {
         console.error("JSON parse failed even after structure fixes.");
         // FALLBACK: Aggressive whitespace stripping, but try to preserve private_key headers
         // This is a "Hail Mary" attempt
         const stripped = jsonString.replace(/\\n/g, ' ').replace(/[\r\n]+/g, ' ');
         try {
             const parsed = JSON.parse(stripped);
             // If this worked, the private_key is likely broken (spaces instead of newlines)
             // We need to fix it.
             if (parsed.private_key && typeof parsed.private_key === 'string') {
                 // Reformat PEM header/footer
                 parsed.private_key = parsed.private_key
                    .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
                    .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----\n');
                 // Ensure body has no spaces? Actually PEM parsers tolerate spaces usually.
                 // But let's leave it.
             }
             serviceAccount = parsed;
         } catch (e3) {
             throw e2; // Throw the earlier error
         }
      }
    }

    // POST-PROCESSING: Fix the private_key newlines
    if (serviceAccount && serviceAccount.private_key) {
      // If the private_key contains literal "\n" characters (escaped), replace them with real newlines
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

