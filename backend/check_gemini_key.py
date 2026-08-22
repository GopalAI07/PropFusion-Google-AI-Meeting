"""
Quick standalone script to check whether your GEMINI_API_KEY works.

Usage:
    cd backend
    python check_gemini_key.py

It reads GEMINI_API_KEY (and optionally GEMINI_MODEL) from your .env file
the same way the app does, and makes one small text-generation call.
"""

import os
import sys

# Load .env the same way the app does (python-dotenv is already a dependency)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()


def main():
    print("=" * 60)
    print(f"Model configured: {MODEL}")

    if not API_KEY or API_KEY == "your-gemini-api-key-here":
        print("[FAIL] GEMINI_API_KEY is missing or still set to the placeholder value.")
        print("       Set it in backend/.env, e.g.:")
        print("       GEMINI_API_KEY=AIzaSy...")
        sys.exit(1)

    masked = API_KEY[:6] + "..." + API_KEY[-4:] if len(API_KEY) > 12 else "***"
    print(f"Key found: {masked}")

    if not API_KEY.startswith("AIzaSy"):
        print(
            "[WARN] This doesn't look like a standard Gemini API key "
            "(those normally start with 'AIzaSy'). It might still work, but "
            "double-check it at https://aistudio.google.com/app/apikey if the test below fails."
        )

    try:
        from google import genai
    except ImportError:
        print("[FAIL] The 'google-genai' package isn't installed. Run:")
        print("       pip install -r requirements.txt")
        sys.exit(1)

    print("Calling Gemini... (this can take a few seconds)")

    try:
        client = genai.Client(api_key=API_KEY)
        response = client.models.generate_content(
            model=MODEL,
            contents="Reply with exactly one word: OK",
        )
        text = (response.text or "").strip()
        print(f"Gemini responded: {text!r}")
        print("[SUCCESS] Your Gemini API key is working.")
    except Exception as e:
        print("[FAIL] The API call failed. Details below:\n")
        print(f"   {type(e).__name__}: {e}")
        print(
            "\nCommon causes:\n"
            "  - Invalid or revoked API key\n"
            "  - Key created for a different Google Cloud project without the Generative Language API enabled\n"
            "  - Model name not available for your key/region (try 'gemini-2.0-flash' or 'gemini-1.5-flash')\n"
            "  - No internet access from this machine"
        )
        sys.exit(1)
    finally:
        print("=" * 60)


if __name__ == "__main__":
    main()