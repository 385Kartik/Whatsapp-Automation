import os
import time
from dotenv import load_dotenv
from google import genai

# --- CONFIGURATION ---
load_dotenv()

# Hum in sabhi models ko ek-ek karke check karenge
MODELS_TO_TEST = [
    "gemini-1.5-flash",          # Sabse Stable & Purana (High Chance)
    "gemini-2.0-flash-lite",     # New & Efficient
    "gemini-2.5-flash-lite",     # Latest Lightweight
    "gemini-2.5-flash",          # Jo teri list me dikh raha tha
    "gemini-2.0-flash",          # Standard 2.0
]

def get_all_keys():
    keys = []
    # Single key check
    single = os.getenv("GEMINI_API_KEY")
    if single: keys.append(single)
    
    # Numbered keys check
    i = 1
    while True:
        k = os.getenv(f"GEMINI_API_KEY_{i}")
        if not k: break
        keys.append(k)
        i += 1
    return keys

def deep_scan():
    keys = get_all_keys()
    print(f"\n🚀 STARTING DEEP SCAN: {len(keys)} Keys x {len(MODELS_TO_TEST)} Models")
    print("=" * 70)
    print(f"{'Key Index':<10} | {'Model Name':<25} | {'Status':<10} | {'Result'}")
    print("=" * 70)

    valid_configs = []

    for idx, api_key in enumerate(keys):
        client = genai.Client(api_key=api_key)
        key_working = False
        
        for model in MODELS_TO_TEST:
            try:
                # 🧪 Test: Ek chhota sa "Hi" bhejo
                response = client.models.generate_content(
                    model=model,
                    contents="Hi"
                )
                
                # Agar yahan tak pahuche matlab SUCCESS!
                print(f"Key {idx+1:<9} | {model:<25} | ✅ PASS     | WORKED!")
                
                # Save this combo
                valid_configs.append((f"GEMINI_API_KEY_{idx+1}", api_key, model))
                key_working = True
                break # Ek model mil gaya is key pe, toh agle key pe chalo (Time bachao)
                
            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg:
                    status = "⚠️ QUOTA"
                elif "404" in error_msg:
                    status = "❌ NO 404" # Model not found for this key
                elif "400" in error_msg:
                    status = "❌ BAD KEY"
                else:
                    status = "❌ ERROR"
                
                # Sirf errors mat print karo agar bohot lambi list hai, 
                # par abhi humein dekhna hai ki kya issue hai
                print(f"Key {idx+1:<9} | {model:<25} | {status:<10} | Failed")
                pass # Silent fail to keep output clean, only show Success
        
        if not key_working:
            print(f"Key {idx+1:<9} | {'ALL MODELS':<25} | ❌ DEAD     | No working model found")
        
        
        time.sleep(0.2)

    print("=" * 70)
    print(f"\n RESULTS: {len(valid_configs)} usable configurations found.")
    
    if valid_configs:
        print("\n Saving 'working_keys.env'...")
        with open("working_keys.env", "w") as f:
            for i, (key_name, key_val, working_model) in enumerate(valid_configs):
                # Hum comment me likh denge ki kaunsa model chala
                f.write(f"GEMINI_API_KEY_{i+1}={key_val} # Works with {working_model}\n")
        
        print(f"✅ Saved! Ab tu 'working_keys.env' use kar sakta hai.")
        print(f"👉 Suggestion: 'main.py' me {valid_configs[0][2]} model use karna.")
    else:
        print("\n💀 SAD NEWS: Saare combinations fail ho gaye. Ab Local AI (Ollama) hi sahara hai.")

if __name__ == "__main__":
    deep_scan()
