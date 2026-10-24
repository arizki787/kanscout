
// get data from apify (curious_coder/linkedin-jobs-scraper)
import { ApifyClient } from 'apify-client';

// Initialize the ApifyClient with your Apify API token
// Replace the '<YOUR_API_TOKEN>' with your token
async function discoverJob(){

    const client = new ApifyClient({
        token: process.env.APIFY_KEY,
    });
    
    // Prepare Actor input
    const input = {
        "urls": [
            "https://www.linkedin.com/jobs/search/?position=1&pageNum=0"
        ],
        "limitPerSource": 50
    };
    
    // Run the Actor and wait for it to finish
    const run = await client.actor("curious_coder/linkedin-jobs-scraper").call(input);
    
    // Fetch and print Actor results from the run's dataset (if any)
    console.log('Results from dataset');
    console.log(`💾 Check your data here: https://console.apify.com/storage/datasets/${run.defaultDatasetId}`);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    items.forEach((item) => {
        console.dir(item);
    });
}

export async function GET(){
    try {
        return Response.json(await discoverJob());
    } catch (error) {
        return Response.json({ error }, { status: 500 });
    }
}