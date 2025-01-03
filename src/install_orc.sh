#!/bin/bash

# Check if the script is being run as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run this script as root or with sudo privileges."
  exit 1
fi

echo "Updating system and installing dependencies..."

# Update and upgrade the system
apt update && apt upgrade -y

# Install necessary system packages
apt install -y python3.8-venv python3.8-pip redis-server curl

# Enable and start the Redis server
systemctl enable redis-server
systemctl start redis-server

echo "Installing Python dependencies..."

# Install Python packages
pip3 install --upgrade pip
pip3 install redis easyocr json logging

# Create a virtual environment
python3 -m venv ocr_env
source ocr_env/bin/activate

# Install Python dependencies inside the virtual environment
pip install redis easyocr json logging

# Deactivate virtual environment for safety
deactivate

# Save the path to the Python script
SCRIPT_PATH=$(pwd)/ocr_with_filter.py

# Generate a PM2 ecosystem file
PM2_CONFIG=ecosystem.config.js

cat <<EOL > $PM2_CONFIG
module.exports = {
  apps: [
    {
      name: "ocr_handler",
      script: "$SCRIPT_PATH",
      interpreter: "$(which python3)",
      env: {
        VIRTUAL_ENV: "$(pwd)/ocr_env",
        PATH: "$(pwd)/ocr_env/bin:\$PATH"
      }
    }
  ]
};
EOL

echo "Starting the ocr handler using PM2..."

# Start the job handler with PM2
pm2 start $PM2_CONFIG
pm2 save

echo "Setting up PM2 to auto-start on system boot..."

# Set PM2 to start on boot
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
pm2 save

echo "Installation completed."
echo "To check the status of the job handler, run: pm2 status"
echo "To view logs, run: pm2 logs ocr_handler"
echo "To restart the service, run: pm2 restart ocr_handler"
