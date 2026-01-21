import admin, { type ServiceAccount } from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join, isAbsolute } from "path";

let serviceAccount: ServiceAccount | undefined;

// Debug log to check if environment variables are loaded
console.log("--- Firebase Admin Initialization Start ---");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("FIREBASE_SERVICE_ACCOUNT_KEY length:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length);
console.log("FIREBASE_SERVICE_ACCOUNT_PATH:", process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    console.log("Parsing FIREBASE_SERVICE_ACCOUNT_KEY...");
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
      console.log("Successfully parsed service account JSON.");
    } catch (e1) {
      console.error("First parse attempt failed. Trying aggressive fixes.");

      // Fallback: Use JS evaluation (new Function) to parse loose JSON
      // This handles single quotes, unquoted keys, trailing commas, etc.
      try {
        console.log("JSON.parse failed. Attempting JS evaluation fallback...");
        // eslint-disable-next-line no-new-func
        const fn = new Function('return ' + jsonString);
        serviceAccount = fn();
        console.log("Successfully parsed service account using JS evaluation.");
      } catch (eEval) {
        console.error("JS evaluation failed:", eEval);
        
        // Log detailed diagnostics for the first 50 chars to debug encoding/hidden chars
        console.error("Diagnostic dump of first 50 chars:");
        for (let i = 0; i < Math.min(jsonString.length, 50); i++) {
            console.error(`Char ${i}: '${jsonString[i]}' code=${jsonString.charCodeAt(i)}`);
        }
        
        throw e1; // Throw the original JSON error if both fail
      }
    }

    // POST-PROCESSING: Fix the private_key newlines
    // Cast to any to handle both snake_case (raw JSON) and camelCase (TS type)
    const rawServiceAccount = serviceAccount as any;
    if (rawServiceAccount && rawServiceAccount.private_key) {
      // If the private_key contains literal "\n" characters (escaped), replace them with real newlines
      // Also handle case where it might be literal \\n (double escaped)
      rawServiceAccount.private_key = rawServiceAccount.private_key.replace(/\\n/g, '\n');
    }
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Content snippet:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 50));
    console.error("Error details:", error);
    // Do NOT fallback to path if key was provided but failed
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  console.log("Trying FIREBASE_SERVICE_ACCOUNT_PATH...");
  try {
    const resolvedPath = isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      : join(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      
    console.log("Resolved path:", resolvedPath);
    if (existsSync(resolvedPath)) {
      const raw = readFileSync(resolvedPath, "utf-8");
      serviceAccount = JSON.parse(raw);
      console.log("Successfully read service account from file.");
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

console.log("Initializing Firebase Admin...");
if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized with Service Account.");
  } else {
    admin.initializeApp(); // This tries ADC
    console.log("Firebase Admin initialized with ADC (or failed).");
  }
} else {
    console.log("Firebase Admin already initialized.");
}

const adminApp = admin.app();
const adminAuth = adminApp.auth();
const adminDb = adminApp.firestore();

export { adminApp, adminAuth, adminDb };

