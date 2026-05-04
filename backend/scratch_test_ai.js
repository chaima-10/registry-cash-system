const apiKey = "AIzaSyC3zBnct0bmHP5GKpxc_eOkw7wCS41yV9E";

async function test() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const body = {
        contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Body:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
