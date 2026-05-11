const apiKey = "AIzaSyC3zBnct0bmHP5GKpxc_eOkw7wCS41yV9E";

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        const names = data.models.map(m => m.name);
        console.log("Available Model Names:", JSON.stringify(names, null, 2));
    } catch (e) {
        console.error("List failed:", e);
    }
}

listModels();
