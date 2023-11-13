let jsonData = {
    "TV show IP": "",
    "Characters": "Chandler, Joey, Monica, Phoebe, Rachel, Ross",
    "Plot Archetype": "",
    "Custom Plot Details": "",
    "Plot Focuses on": "",
    "Outline": "",
    "Number of Acts": null,
    "Scenes": [],
    "FinalDraftText": "",
    "EpisodeTitle": ""
}


function loadJsonDataFromSession() {
    if (sessionStorage.getItem("jsonData")) {
        jsonData = JSON.parse(sessionStorage.getItem("jsonData"));
    }
}


function displaySessionData() {
    const sessionData = sessionStorage.getItem("jsonData");
    $('#sessionDataDisplay').text(sessionData);
}


function filterOAIOutputString(text) {
    const lines = text.split('\n');
    let filteredLines = [];

    for (let line of lines) {
        if (line.trim() === "") continue; // Skip blank lines
        else if (line.toLowerCase().startsWith("title:")) continue; // Skip lines starting with "Title:"
        else if (line.length < 30) continue;
        else if (line.toLowerCase().startsWith("summary: ")) {
            // Remove "Summary: " but keep the rest of the line
            filteredLines.push(line.slice(9));
        } else if (line.toLowerCase().startsWith("outline: ")) {
            // Remove "Outline: " but keep the rest of the line
            filteredLines.push(line.slice(9));
        } else if (line.toLowerCase().startsWith("revised: ")) {
            // Remove "Outline: " but keep the rest of the line
            filteredLines.push(line.slice(9));
        } else if (line.toLowerCase().startsWith("rewritten: ")) {
            filteredLines.push(line.slice(11));
        } else if (line.toLowerCase().startsWith("rewritten scene summary: ")) {
            filteredLines.push(line.slice(25));
        } else if (line.toLowerCase().startsWith("scene summary: ")) {
            filteredLines.push(line.slice(15));
        } else if (line.startsWith('"') && line.endsWith('"')) {
            filteredLines.push(line.slice(1, -1));
        } else {
            // Keep other lines as they are
            filteredLines.push(line);
        }
    }

    return filteredLines.join('\n');
}

function filterOAITitle(str) {
    // Trim whitespace from the start and end of the string
    str = str.trim();

    // Check if the first and last characters are quotes
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
        // Remove the first and last characters
        str = str.substring(1, str.length - 1);
    }

    return str;
}


function filterFinalDraftText(text) {
    const lines = text.split('\n');
    let filteredLines = [];

    for (let line of lines) {
        if (line.startsWith("Act") && line.includes("Scene")) continue;
        else filteredLines.push(line);
    }
    return filteredLines.join('\n');
}



function sendToBackend(buttonSelector, sceneHeader, promptType, callback) {
    // Get the button and spinner elements
    let $button = $(buttonSelector);
    let $spinner = $button.find('.spinner-border');

    // Disable the button and show the spinner
    $button.prop('disabled', true);
    $spinner.show();
    // Prepare the data to send
    let dataToSend = {
        "input_information": jsonData,
        "scene_header": sceneHeader,
        "prompt_type": promptType
    };

    // Perform the AJAX request to the backend
    $.ajax({
        url: 'https://yaddaverse.azurewebsites.net/api/openai',  // The endpoint where your Flask app is expecting the POST request
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(dataToSend),
        success: function(response) {
            // If the request was successful, execute the callback with the response
            if (callback && typeof callback === 'function') {
                callback(response);
            }
        },
        error: function(xhr, status, error) {
            // Handle error
            console.error("Error occurred:", xhr, status, error);
        },
        complete: function() {
            // Always re-enable the button and hide the spinner after the AJAX call
            $button.prop('disabled', false);
            $spinner.hide();
        }
    });
}


function populateScenesForAct(actNumber) {
    let actData = jsonData.Scenes.find(act => act.Act === actNumber);
    if (!actData) {
        console.error(`No scenes found for Act ${actNumber}`);
        return;
    }

    let scenesContainer = $('#scenes-container');
    scenesContainer.empty();  // Clear the container

    actData.Scenes.forEach((scene, index) => {
        let sceneElement = `
            <div class="col-md-3 scene">
                <h5>${scene.header}</h5>
                <textarea class="form-control mb-3" rows="10">${scene.summary || ''}</textarea>
                <p>Rewriting instructions</p>
                <input type="text" class="form-control mb-3" placeholder="e.g. Add more conflict">
                <button class="btn btn-secondary mb-3 edit-scene-btn" data-act-number="${actNumber}" data-scene-index="${index}">Rewrite Scene</button>
            </div>
        `;
        scenesContainer.append(sceneElement);
    });
    $('.edit-scene-btn').click(function() {
        let actNumber = $(this).data('act-number');
        let sceneIndex = $(this).data('scene-index');
        let button = $(this); // Save the reference to the button
        let currentSceneTextarea = button.closest('.scene').find('textarea');
        let currentSceneSummary = currentSceneTextarea.val(); // Get current value of textarea
        let currentSceneInput = button.closest('.scene').find('input');
        let currentSceneEditingInstructions = currentSceneInput.val(); // Get current value of input
        let sceneHeader = jsonData.Scenes.find(act => act.Act === actNumber).Scenes[sceneIndex].header;
        // Update the jsonData with the current summary from the textarea
        jsonData.Scenes.find(act => act.Act === actNumber).Scenes[sceneIndex].summary = currentSceneSummary;
        jsonData.Scenes.find(act => act.Act === actNumber).Scenes[sceneIndex].editingInstructions = currentSceneEditingInstructions;
        // Make sure spinner element exists in the button HTML
        if (button.find('.spinner-border').length === 0) {
            button.append('<span class="spinner-border rewrite-spinner-margin spinner-border-sm" role="status" aria-hidden="true"></span>');
        }
        sendToBackend(button, sceneHeader,'edit_scene', function(response) {
            filteredSceneSummary = filterOAIOutputString(response.text);
            let newSummary = filteredSceneSummary;
            // Update jsonData with the new summary
            jsonData.Scenes.find(act => act.Act === actNumber)
                .Scenes[sceneIndex].summary = newSummary;
            // Update the textarea for the scene with the new summary
            currentSceneTextarea.val(newSummary);
            // Update the sessionStorage or display the data as needed
            sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
        });
    });
}


function extractActAndScene(stringContainingHeader) {
    // Regular expression to find a number after "Act" and "Scene"
    const actRegex = /Act\s+(\d+)/i;
    const sceneRegex = /Scene\s+(\d+)/i;

    let act = null;
    let scene = null;

    // Extracting the number following "Act"
    const actMatch = stringContainingHeader.match(actRegex);
    if (actMatch) {
        act = parseInt(actMatch[1], 10);
    }

    // Extracting the number following "Scene"
    const sceneMatch = stringContainingHeader.match(sceneRegex);
    if (sceneMatch) {
        scene = parseInt(sceneMatch[1], 10);
    }

    return { act, scene };
}


// Function to parse the input text and create a nested JSON structure
function textToJson(text) {

    const lines = text.trim().split('\n').filter(line => line);

    const actData = {};

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Skip processing if the line is empty
        if (line === '') {
            return;
        }
        if (line.length < 20) {
            const { act, scene} = extractActAndScene(line)
            const header = `Act ${act}, Scene ${scene}`;
            let summaryContent = '';
            if (i + 1 < lines.length) {
                summaryContent = lines[i + 1].trim();
                i++; // This will now correctly skip the next iteration
            }

            // Append to act data, creating the list if necessary
            actData[`Act ${act}`] = actData[`Act ${act}`] || [];
            actData[`Act ${act}`].push({
                header: header,
                summary: summaryContent,
                text: "",
                editingInstructions: ""
            });
        } else {
            function splitSceneDescription(inputString) {
                // Check if the first 20 characters include "Act" and "Scene"
                const firstTwenty = inputString.substring(0, 20);
                if (firstTwenty.includes("Act") && firstTwenty.includes("Scene")) {
                    // Split the string into words
                    const words = inputString.split(" ");
                    let splitIndex = -1;
                    for (let i = 0; i < words.length; i++) {
                        if (words[i] !== "Act" && words[i] !== "Scene" && /^[a-zA-Z]+$/.test(words[i])) {
                            // Found the first word that is not "Act" or "Scene"
                            splitIndex = i;
                            break;
                        }
                    }

                    if (splitIndex !== -1) {
                        // Split the string at the found index
                        const rawHeader = words.slice(0, splitIndex).join(" ");
                        const summary = words.slice(splitIndex).join(" ");
                        return { rawHeader, summary };
                    }
                }
            }
            const { rawHeader, summary } = splitSceneDescription(line);
            const { act, scene} = extractActAndScene(rawHeader)
            const header = `Act ${act}, Scene ${scene}`;
            const summaryContent = summary.trim();

            // Append to act data, creating the list if necessary
            actData[`Act ${act}`] = actData[`Act ${act}`] || [];
            actData[`Act ${act}`].push({
                header: header,
                summary: summaryContent,
                text: "",
                editingInstructions: ""
            });
        }
    }
    return actData;
}


function integrateScenes(pythonOutput) {
    // Create an array to hold the new scenes structure
    let newScenes = [];

    // Iterate through the acts in the pythonOutput
    for (const act in pythonOutput) {
        // Extract the act number from the string (e.g., "Act 1" -> 1)
        const actNumber = parseInt(act.match(/\d+/)[0], 10);

        // Map the scenes to the structure expected in jsonData
        const scenesForAct = pythonOutput[act].map(scene => ({
            "header": scene.header,
            "summary": scene.summary,
            "text": "",
            "editingInstructions": ""
        }));

        // Add the scenes to the newScenes array
        newScenes.push({
            "Act": actNumber,
            "Scenes": scenesForAct
        });
    }

    // Sort the acts by their number to maintain order
    newScenes.sort((a, b) => a.Act - b.Act);

    return newScenes;
}

let ipDictionary = {
    "Friends": "Friends (1994-2004)"
};

// Page 1 - Initialization and Event Handlers
if (document.title === "Yaddaverse - Episode Creator Step 1") {
    $(document).ready(function() {
        loadJsonDataFromSession();
        displaySessionData();
        // Handle when the "Generate Episode Outline" button is clicked
        $('#generateOutlineButton').click(function() {
            jsonData["TV show IP"] = ipDictionary[$('#ip').val()];
            jsonData["Plot Archetype"] = $('#plotType').val();
            jsonData["Custom Plot Details"] = $('#customPlot').val();
            jsonData["Plot Focuses on"] = $('#episodeFocus').val();

            sendToBackend('#generateOutlineButton', null, 'generate_outline', function(response) {
                // Update jsonData with the response
                filteredOutline = filterOAIOutputString(response.text)
                jsonData.Outline = filteredOutline;
                // Update the sessionStorage or display the data as needed
                sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
                window.location.href = "createdraft.html";
            });
        });
    });
}

// Page 2 - Initialization and Event Handlers
if (document.title === "Yaddaverse - Episode Creator Step 2") {
    $(document).ready(function() {
        $('.spinner-border').hide();
        loadJsonDataFromSession();
        displaySessionData();
        $('#outline').val(jsonData.Outline);
        // Handle when the "Generate Draft" button is clicked
        $('#editOutlineButton').click(function() {
            jsonData["Outline Editing Instructions"] = $('#editingInstructions').val();
            jsonData["Outline"] = $('#outline').val();

            sendToBackend('#editOutlineButton', null, 'edit_outline', function(response) {
                // Update jsonData with the response
                jsonData.Outline = response.text;
                // Update the sessionStorage or display the data as needed
                $('#outline').val(jsonData.Outline);
                sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
            });
        });
        // Handle when the "Generate Draft" button is clicked
        $('#generateDraftButton').click(function() {
            jsonData.Outline = $('#outline').val();
            jsonData["Number of Acts"] = $('#acts').val();
            sendToBackend('#generateDraftButton', null, 'generate_draft', function(response) {
                // Update jsonData with the response
                const jsonStructure = textToJson(response.text);
                jsonData.Scenes = integrateScenes(jsonStructure);
                // Update the sessionStorage or display the data as needed
                sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
                window.location.href = "savedraft.html";
            });
        });
    });
}

// Page 3 - Initialization and Event Handlers
if (document.title === "Yaddaverse - Episode Creator Step 3") {
    $(document).ready(function() {
        loadJsonDataFromSession();
        let actSelector = $('#act-selector');

        // Assuming jsonData is loaded properly and has "Number of Acts" property
        for (let i = 1; i <= jsonData["Number of Acts"]; i++) {
            actSelector.append(`<option value="act${i}">Act ${i}</option>`);
        }

        // Assuming displaySessionData is a synchronous operation
        displaySessionData();

        // Assuming populateScenesForAct is defined and working properly
        populateScenesForAct(1); // This will load Act 1 scenes initially
        $('#scenes-container').on('click', '.scene .btn-primary', function() {
            let sceneIndex = $(this).closest('.scene').index();
            let sceneTextarea = $(this).siblings('textarea');
            let selectedActNumber = parseInt($('#act-selector').val().replace('act', ''));
            jsonData.Acts[selectedActNumber - 1].Scenes[sceneIndex] = sceneTextarea.val();
            sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
        });
        $('#act-selector').change(function() {
            const selectedActNumber = parseInt($(this).val().replace('act', ''));
            populateScenesForAct(selectedActNumber);
        });
        $('#saveDraft').click(function() {
            sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
			// disabling button and revealing spinner
			let $saveDraftbutton = $('#saveDraft');
			let $saveDraftspinner = $saveDraftbutton.find('.spinner-border');
			$saveDraftbutton.prop('disabled', true);
			$saveDraftspinner.show();

            function expandScenes(jsonData) {
                let scenes = jsonData.Scenes;
                let promises = [];

                scenes.forEach((act) => {
                    act.Scenes.forEach((scene) => {
                        let promise = new Promise((resolve) => {
                            sendToBackend(null, scene.header, "expand_scene", function(response) {
                                scene.text = response.text;
                                resolve();
                            });
                        });
                        promises.push(promise);
                    });
                });

                return Promise.all(promises);
            }

            function concatenateSceneTexts(jsonData) {
                let concatenatedText = "";

                jsonData.Scenes.forEach(act => {
                    act.Scenes.forEach(scene => {
                        if (scene.text) {
                            concatenatedText += scene.text + "\n\n";
                        }
                    });
                });

                concatenatedText = concatenatedText.trimEnd();
                return concatenatedText;
            }
            expandScenes(jsonData).then(() => {
                const rawScriptText = concatenateSceneTexts(jsonData);
				jsonData.FinalDraftText = filterFinalDraftText(rawScriptText);
                sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
                new Promise((resolve) => {
                    sendToBackend(null, null, 'create_title', function(response) {
                        jsonData.EpisodeTitle = filterOAITitle(response.text);
                        resolve();
                    });
                }).then(() => {
                    sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
                    fetch('template.docx')
                        .then(response => response.blob())
                        .then(blob => {
                            var reader = new FileReader();
                            reader.onload = function(event) {
                                var content = event.target.result;
                                createAndDownloadDocx(content, jsonData);
                            };
                            reader.readAsBinaryString(blob);
                        })
                    function createAndDownloadDocx(content, jsonData) {
                        // Create a zip instance and load the binary content
                        var zip = new PizZip(content);

                        // Create a new instance of docxtemplater using the zip instance
                        var doc = new docxtemplater(zip, { linebreaks: true });

                        doc.setData({
                            TITLE_PLACEHOLDER: jsonData["EpisodeTitle"].toUpperCase(),
                            CONTENT_PLACEHOLDER: jsonData["FinalDraftText"]
                        });

                        // Apply the data to the template
                        doc.render();

                        // Generate the .docx file content as a blob
                        var blob = doc.getZip().generate({ type: 'blob' });

                        // Create a download link and trigger the download
                        var url = URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.href = url;
                        const ipName = Object.keys(ipDictionary).find(key => ipDictionary[key] === jsonData["TV show IP"]);
                        a.download = ipName + " - " + jsonData.EpisodeTitle + ".docx";
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
						$saveDraftbutton.prop('disabled', false);
						$saveDraftspinner.hide();
                    }
                });
            });
		});
    });
}    
