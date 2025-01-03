const Redis = require('ioredis');
const redis = new Redis();  // Create a new Redis client

// Function to add job to the queue
async function addJob(channelId, guildId, { filePath, namesJson}, { datetime, type, location }) {
    const job = { channelId, guildId, filePath, namesJson, datetime, type, location };
    redis.publish('jobQueue', JSON.stringify(job), (err, reply) => {
        if (err) {
            console.error('Failed to publish job:', err);
        } else {
            console.log('Job published:', reply);
        }
    });
}

// Export addJob for use in other files
module.exports = { addJob };
