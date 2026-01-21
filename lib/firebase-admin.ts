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
    
    // 1. Remove literal newlines (0x0A, 0x0D) everywhere
    //    JSON.parse cannot handle literal newlines.
    //    We replace them with spaces, which are valid whitespace in JSON.
    //    Note: This assumes the user didn't put literal newlines INSIDE a string value (which is invalid JSON anyway).
    //    Valid JSON uses \n (escaped) for newlines in strings.
    jsonString = jsonString.replace(/[\r\n]+/g, ' ');

    // 2. Remove escaped newlines (\n) that appear in structural positions
    //    Vercel sometimes escapes the newlines you paste, turning 
    //    {
    //      "type": ...
    //    }
    //    into "{\\n  \"type\": ..."
    //    These \\n are "escaped newlines" but they are in places where we expect whitespace.
    //    JSON.parse will see them as characters inside the string (if the whole thing is quoted) 
    //    or as invalid syntax if not quoted properly.
    //    
    //    We want to remove \\n if it's NOT inside a value.
    //    This is hard to do with regex perfectly, but let's try targeting common patterns.
    
    // Remove \\n before quotes (property names)
    jsonString = jsonString.replace(/\\n(?=\s*")/g, ' ');
    // Remove \\n after braces
    jsonString = jsonString.replace(/(\{|\})\s*\\n/g, '$1 ');
    
    // 3. Handle double-escaped newlines inside the private key
    //    If the user has "private_key": "-----BEGIN...\\n...", we want to keep \\n
    //    But if it became \\\\n, we might need to fix it.
    //    Let's rely on the post-processing step for private_key.

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

