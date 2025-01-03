from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

# Load the image
image = Image.open('image.png')

# Convert the image to grayscale
gray_image = image.convert('L')

# Enhance the image contrast
enhancer = ImageEnhance.Contrast(gray_image)
enhanced_image = enhancer.enhance(2)  # Increase contrast (adjust value as needed)

# Apply a filter to reduce noise (optional)
filtered_image = enhanced_image.filter(ImageFilter.MedianFilter())

# Perform OCR
extracted_text = pytesseract.image_to_string(filtered_image)

print(extracted_text)
