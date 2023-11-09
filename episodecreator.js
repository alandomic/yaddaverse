let jsonData = {
    "IP": "",
    "Plot Archetype": "",
    "Custom Plot Details": "",
    "Plot Focuses on": "",
    "Outline": "",
    "Outline Editing Instructions": "",
    "Number of Acts": 4,
    "Scenes": [
        {
            "Act": 1,
            "Scenes": [
                {
                    "header": "Act 1, Scene 1",
                    "summary": "Chandler expresses his hesitancy to attend the seminar to Monica and Rachel. Chandler is hesitant about attending the seminar, worried that his lack of a college degree will make him stand out. Monica and Rachel convince him to go, promising to support him and join him for the seminar.",
                    "text": "",
                    "editing instructions": ""
                },
                {
                    "header": "Act 1, Scene 2",
                    "summary": "Joey and Ross decide to tag along. After Chandler agrees to attend the seminar, Joey and Ross decide to join him, hoping to impress the ladies. Chandler is not pleased with this development but agrees to let them come along.",
                    "text": "",
                    "editing instructions": ""
                }
            ]
        },
        {
            "Act": 2,
            "Scenes": [
                {
                    "header": "Act 2, Scene 1",
                    "summary": "Chandler panics about public speaking. As he waits to give his speech, Chandler confides in his friends about his fear of public speaking. They all encourage him and offer their support.",
                    "text": "",
                    "editing instructions": ""
                },
                {
                    "header": "Act 2, Scene 2",
                    "summary": "The group helps Chandler prepare for his speech. The others rally together to help Chandler overcome his anxiety. They come up with a plan to help him practice and feel more confident before giving his speech.",
                    "text": "",
                    "editing instructions": ""
                }
            ]
        },
        {
            "Act": 3,
            "Scenes": [
                {
                    "header": "Act 3, Scene 1",
                    "summary": "Monica and Rachel take a cooking class. While Chandler is at the seminar, Monica and Rachel decide to take a cooking class. They hope to improve their skills and have a fun day together.",
                    "text": "",
                    "editing instructions": ""
                },
                {
                    "header": "Act 3, Scene 2",
                    "summary": "Joey and Ross join the cooking class. Joey and Ross happen to be taking a class in the same building and decide to join Monica and Rachel in the cooking class. Their competitive nature and attempts to impress the instructor cause chaos in the kitchen.",
                    "text": "",
                    "editing instructions": ""
                }
            ]
        },
        {
            "Act": 4,
            "Scenes": [
                {
                    "header": "Act 4, Scene 1",
                    "summary": "Chandler delivers a successful speech. With the support and help of his friends, Chandler overcomes his fear and gives a great speech at the seminar. The audience is impressed and Chandler feels a sense of accomplishment.",
                    "text": "",
                    "editing instructions": ""
                },
                {
                    "header": "Act 4, Scene 2",
                    "summary": "The group celebrates with a home-cooked meal. To celebrate Chandler's success, the group decides to use the skills they learned in the cooking class to prepare a meal together. They reflect on how they worked together to overcome their challenges.",
                    "text": "",
                    "editing instructions": ""
                }
            ]
        }
    ],
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
                <p>Rewriting instructions (optional)</p>
                <input type="text" class="form-control mb-3" placeholder="e.g. 'Make it more lighthearted">
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
        let sceneHeader = jsonData.Scenes.find(act => act.Act === actNumber).Scenes[sceneIndex].header;
        // Update the jsonData with the current summary from the textarea
        jsonData.Scenes.find(act => act.Act === actNumber).Scenes[sceneIndex].summary = currentSceneSummary;
		// Make sure spinner element exists in the button HTML
		button.append('<span class="spinner-border rewrite-spinner-margin spinner-border-sm" role="status" aria-hidden="true"></span>');
        sendToBackend(button, sceneHeader,'edit_scene', function(response) {
            let newSummary = response.text;
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

function textToJson(text) {
    // Split text into sections for each act
    const actSections = text.trim().split("Act ").slice(1); // skip the first empty string
    const actData = {};

    actSections.forEach((actSection) => {
        const lines = actSection.trim().split('\n').filter(line => line); // remove empty lines
        lines.forEach((line) => {
            const [actScene, content] = line.split(':');
            const [act, scene] = actScene.replace(",", "").split(' Scene ');
            const header = `Act ${act}, Scene ${scene}`;
            const summaryContent = content.trim();

            // Append to act data, creating the list if necessary
            actData[`Act ${act}`] = actData[`Act ${act}`] || [];
            actData[`Act ${act}`].push({
                header: header,
                summary: summaryContent,
                text: "",
                editingInstructions: ""
            });
        });
    });

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
            "text": scene.text
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

// Page 1 - Initialization and Event Handlers
if (document.title === "Yaddaverse - Episode Creator Step 1") {
    $(document).ready(function() {
        loadJsonDataFromSession();
        displaySessionData();
        // Handle when the "Generate Episode Outline" button is clicked
        $('#generateOutlineButton').click(function() {
            jsonData["IP"] = $('#ip').val();
            jsonData["Plot Archetype"] = $('#plotType').val();
            jsonData["Custom Plot Details"] = $('#customPlot').val();
            jsonData["Plot Focuses on"] = $('#episodeFocus').val();

            let inputInformation = `IP: ${jsonData["IP"]}\n` +
                `Plot Archetype: ${jsonData["Plot Archetype"]}\n` +
                `Custom Plot Details: ${jsonData["Custom Plot Details"]}\n` +
                `Plot Focuses on: ${jsonData["Plot Focuses on"]}`;

            sendToBackend('#generateOutlineButton', null, 'generate_outline', function(response) {
                // Update jsonData with the response
                jsonData.Outline = response.text;
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
            jsonData["Outline Editing Instructions"] = $('#editOutline').val();

            let inputInformation = `Outline: ${jsonData["Outline"]}\n` +
                `Outline Editing Instructions: ${jsonData["Outline Editing Instructions"]}\n`;

            sendToBackend('#editOutlineButton', null, 'edit_outline', function(response) {
                // Update jsonData with the response
                jsonData.Outline = response.text;
                // Update the sessionStorage or display the data as needed
                sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
            });
        });
        // Handle when the "Generate Draft" button is clicked
        $('#generateDraftButton').click(function() {
            jsonData.Outline = $('#outline').val();
            jsonData["Number of Acts"] = $('#acts').val();

            let inputInformation = `Number of Acts: ${jsonData["Number of Acts"]}
			Outline: ${jsonData["Outline"]}`;

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
            function expandScenes(jsonData) {
                let scenes = jsonData.Scenes;
                let promises = [];

                scenes.forEach((act) => {
                    act.Scenes.forEach((scene) => {
                        let promise = new Promise((resolve) => {
                            sendSceneToBackend('#saveDraft', scene.header, "expand_scene", function(response) {
                                scene.text = response.text;
                                resolve();
                            });
                        });
                        promises.push(promise);
                    });
                });

                Promise.all(promises).then(() => {
                    sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
                });
            }
            expandScenes(jsonData);
            function concatenateSceneTexts(jsonData) {
                let concatenatedText = "";

                // Iterate through each 'Act' in the 'Scenes' array
                jsonData.Scenes.forEach(act => {
                    act.Scenes.forEach(scene => {
                        // Check if 'text' is not an empty string
                        if (scene.text) {
                            concatenatedText += scene.text + "\n\n";
                        }
                    });
                });

                // Remove the last two newline characters from the end of the string if it exists
                concatenatedText = concatenatedText.trimEnd();

                return concatenatedText;
            }
            jsonData.FinalDraftText = concatenateSceneTexts(jsonData)
            sendToBackend('#saveDraft', null, 'create_title', function(response) {
                jsonData.Title = response.text
                sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
            });
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

                // Create a new instance of Docxtemplater using the zip instance
                var doc = new Docxtemplater(zip);

                doc.setData({
                    TITLE_PLACEHOLDER: jsonData["FinalDraftTitle"].toUpperCase(),
                    CONTENT_PLACEHOLDER: jsonData["FinalDraftContent"]
                });

                // Apply the data to the template
                doc.render();

                // Generate the .docx file content as a blob
                var blob = doc.getZip().generate({ type: 'blob' });

                // Create a download link and trigger the download
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = jsonData.IP + " - " + jsonData.Title + ".docx";
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            }
        });
    });
}