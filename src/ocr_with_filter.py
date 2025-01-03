import os
os.environ['USE_NNPACK'] = '0'
import ssl
import warnings
import redis
import easyocr
import json
import sys
import logging


# Suppress FutureWarnings
warnings.simplefilter(action='ignore', category=FutureWarning)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize Redis client
redis_client = redis.StrictRedis(host='localhost', port=6379, db=0)

# Create an EasyOCR reader for supported languages
reader_en_th = easyocr.Reader(['en', 'th'], gpu=False, detector='dbnet18')
reader_en_id = easyocr.Reader(['en', 'id'], gpu=False, detector='dbnet18')
reader_en_ch_sim = easyocr.Reader(['en', 'ch_sim'], gpu=False, detector='dbnet18')
reader_en_ch_tra = easyocr.Reader(['en', 'ch_tra'], gpu=False, detector='dbnet18')

def load_names_from_json(json_string):
    try:
        names = json.loads(json_string)
        if not isinstance(names, list):
            raise ValueError("JSON must be an array of names.")
        return names
    except (json.JSONDecodeError, ValueError) as e:
        logging.error(f"Error loading names from JSON: {e}")
        return []

def find_matching_text(detected_text, search_list):
    return [name for name in search_list if name.lower() in detected_text.lower()]

def perform_ocr_and_find_names(reader, image_path, names_to_find):
    try:
        results = reader.readtext(image_path)
        found_names = []
        for bbox, text, prob in results:
            matched_names = find_matching_text(text, names_to_find)
            if matched_names:
                found_names.extend(matched_names)
        return found_names
    except Exception as e:
        logging.error(f"Error during OCR: {e}")
        return []

def process_job(message):
    logging.info("Processing a job.")
    redis_client.decr('pending_jobs')  # Decrement the pending jobs counter
    
    data = json.loads(message['data'])
    image_path = data.get('filePath')
    names_json = data.get('namesJson')
    channel_id = data.get('channelId')
    guild_id = data.get('guildId')
    datetime = data.get('datetime')
    type_activity = data.get('type')
    location = data.get('location')

    if not image_path or not names_json:
        logging.error("Invalid job data. Missing 'filePath' or 'namesJson'.")
        return

    names_to_find = load_names_from_json(names_json)
    found_names = []
    found_names.extend(perform_ocr_and_find_names(reader_en_th, image_path, names_to_find))
    found_names.extend(perform_ocr_and_find_names(reader_en_id, image_path, names_to_find))
    found_names.extend(perform_ocr_and_find_names(reader_en_ch_sim, image_path, names_to_find))
    found_names.extend(perform_ocr_and_find_names(reader_en_ch_tra, image_path, names_to_find))

    output = {
        "imagePath": image_path,
        "channelId": channel_id,
        "guildId": guild_id,
        "matching_names": list(set(found_names)),
        "total_names_found": len(found_names),
        "interactionOptions" : {
            "datetime": datetime,
            "type": type_activity,
            "location": location
        }
    }

    # Publish completion event
    redis_client.publish('jobCompletion', json.dumps(output))
    logging.info(f"Job completed. Found names: {output['matching_names']}")

def message_handler(message):
    if message['type'] == 'message':
        process_job(message)

def job_queue_handler():
    logging.info('Waiting for jobs...')
    try:
        for message in pubsub.listen():
            message_handler(message)
            # Check pending jobs count
            pending_jobs = redis_client.get('pending_jobs')
            logging.info(f"Pending jobs: {int(pending_jobs) if pending_jobs else 0}")
    except KeyboardInterrupt:
        logging.info('Shutting down...')

# Subscribe to job queue and initialize pending jobs counter
pubsub = redis_client.pubsub()
pubsub.subscribe(**{'jobQueue': message_handler})

# Initialize the pending jobs counter (you might set it differently in a real application)
redis_client.set('pending_jobs', 0)

# This is where you'd add jobs to the queue
def add_job_to_queue(file_path, names_json, channel_id, guild_id):
    redis_client.incr('pending_jobs')  # Increment the pending jobs counter
    job_data = json.dumps({"filePath": file_path, "namesJson": names_json, "channelId": channel_id, "guildId": guild_id})
    redis_client.publish('jobQueue', job_data)
    logging.info(f"Job added to queue. Pending jobs: {redis_client.get('pending_jobs')}")

# For testing
# add_job_to_queue('path/to/image.jpg', json.dumps(['John Doe', 'Jane Doe']), '12345', '67890')

job_queue_handler()
