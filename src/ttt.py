import re
from paddleocr import PaddleOCR

# Initialize OCR
ocr = PaddleOCR(lang='en', det=True, cls=False, drop_score=0.1)

# Image path
img_path = 'image.png'

# Perform OCR
result = ocr.ocr(img_path)

# Extract and process results
detected_texts = []
if not result or not result[0]:
    print("No text detected.")
else:
    for res in result[0]:
        detected_text = res[1][0]  # Extract detected text
        confidence = res[1][1]    # Extract confidence score
        print(f"Detected text: {detected_text} with confidence: {confidence}")
        detected_texts.append(detected_text)

# Normalize a string by removing non-alphanumeric characters
def normalize_text(text):
    return re.sub(r'\W+', '', text).lower()

# Normalize detected texts
normalized_detected = [normalize_text(text) for text in detected_texts]

# Search list
search_list = [
    "annitaa", "Bednaomi", "chocopie", "Cipherメ", "Daisuke", "Eglot", "Dandelion",
    "DsnyPrincess", "elkrapS", "EraserRed", "EzKills", "GabriellaFe", "HIR0N0",
    "Ian", "izvne", "JaaayBeeee04", "Janelle", "Jayveelgop", "Kem12", "NDID",
    "Oputu", "Smiley", "Sova", "Zaiij", "Primee", "Няшка", "엠시丶Azmodメ",
    "엠시丶Bonnnnnメ", "엠시丶Chovieメ", "엠시丶ChupSx", "엠시丶DadChiLLメ",
    "엠시丶Darzaメ", "엠시丶E1", "엠시丶Etomac13メ", "엠시丶FAITHメ",
    "엠시丶Flariumメ", "엠시丶Forceメ", "엠시丶Griffithメ", "엠시丶Hakiメ",
    "엠시丶Hwangメ", "엠시丶IMUSAMAメ", "엠시丶iPetaメ", "엠시丶JeiBiメ",
    "엠시丶Jiffyメ", "엠시丶Kirito丶Sメ", "엠시丶Mariaaaメ", "엠시丶Markメ",
    "엠시丶Otakuメ", "엠시丶Phivsメ", "엠시丶Refineメ", "엠시丶S3creメ",
    "엠시丶SECOSANQメ", "엠시丶Shadowメ", "10", "aiLilO2327", "AinzOoalGown",
    "Anastasia", "ANTRAXXID"
]

# Normalize search list
normalized_search_list = [normalize_text(name) for name in search_list]

# Match normalized detected texts with the normalized search list
matches = [
    original_text for original_text, normalized_text in zip(detected_texts, normalized_detected)
    if normalized_text in normalized_search_list
]

# Display matches
if matches:
    print("\nMatched texts:")
    for match in matches:
        print(match)

    # Save matches to a file
    with open("matched_texts.txt", "w") as file:
        for match in matches:
            file.write(f"{match}\n")
    print("\nMatched texts saved to 'matched_texts.txt'.")
else:
    print("\nNo matches found in the detected text.")
