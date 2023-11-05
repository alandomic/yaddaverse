// Mock JSON Data
let jsonData = {
    "IP": "",
    "Characters": [],
    "Plot Archetype": "",
    "Custom Plot Details": "",
    "Plot Focuses on": "",
    "Outline": "",
    "Edits to Make to Outline": "",
    "Number of Acts": 3,
    "Acts": [
        { "Act": 1, "Scenes": ["", "", ""] },
        { "Act": 2, "Scenes": ["", "", "", ""] },
        { "Act": 3, "Scenes": ["", "", "", ""] }
    ],
	"Final Draft Text": ""
};

function loadJsonDataFromSession() {
    if (sessionStorage.getItem("jsonData")) {
        jsonData = JSON.parse(sessionStorage.getItem("jsonData"));
    }
}

function populateScenesForAct(actNumber) {
    let actData = jsonData.Acts[actNumber - 1];
    let scenesContainer = $('#scenes-container');
    scenesContainer.empty();  // Clear the container

    for (let i = 0; i < actData.Scenes.length; i++) {
        let scene = `
            <div class="col-md-3 scene">
                <h5>Scene ${i + 1}</h5>
                <textarea class="form-control mb-3" placeholder="Scene content...">${actData.Scenes[i] || ''}</textarea>
                <p>Edits to make (optional)</p>
                <input type="text" class="form-control mb-3">
                <button class="btn btn-primary mb-3">Edit Scene</button>
            </div>
        `;
        scenesContainer.append(scene);
    }
}

function displaySessionData() {
    const sessionData = sessionStorage.getItem("jsonData");
    $('#sessionDataDisplay').text(sessionData);
}

function sendToBackend(inputInformation, promptType, callback) {
    // Prepare the data to send
    let dataToSend = {
        "input_information": inputInformation,
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
        }
    });
}


// Page 1 - Initialization and Event Handlers
if (document.title === "Yaddaverse - Episode Creator Step 1") {
    $(document).ready(function() {
        loadJsonDataFromSession();
		displaySessionData();
        // Handle when the "Generate Episode Outline" button is clicked
        $('#generateOutlineButton').click(function() {
			jsonData["IP"] = $('#ip').val();
            jsonData.Characters = $('input[name="character"]:checked').map(function() { return this.value; }).get();
            jsonData["Plot Archetype"] = $('#plotType').val();
            jsonData["Custom Plot Details"] = $('#customPlot').val();
            jsonData["Plot Focuses on"] = $('#episodeFocus').val();

			let inputInformation = `IP: ${jsonData["IP"]}\n` +
					   `Characters: ${jsonData["Characters"].join(', ')}\n` +
					   `Plot Archetype: ${jsonData["Plot Archetype"]}\n` +
					   `Custom Plot Details: ${jsonData["Custom Plot Details"]}\n` +
					   `Plot Focuses on: ${jsonData["Plot Focuses on"]}`;

			sendToBackend(inputInformation, 'generate_outline', function(response) {
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
		loadJsonDataFromSession();
		displaySessionData();
		$('#outline').val(jsonData.Outline);
        // Handle when the "Generate Draft" button is clicked
        $('.btn-primary').click(function() {
            jsonData.Outline = $('#outline').val();
            jsonData["Edits to Make to Outline"] = $('#instructions').val();
            jsonData["Number of Acts"] = $('#acts').val();
			sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
            window.location.href = "savedraft.html"; 
        });
    });
}

// Page 3 - Initialization and Event Handlers
if (document.title === "Yaddaverse - Episode Creator Step 3") {
    $(document).ready(function() {
		loadJsonDataFromSession();
		let actSelector = $('#act-selector');
        for (let i = 1; i <= jsonData["Number of Acts"]; i++) {
            actSelector.append(`<option value="act${i}">${i}</option>`);
        }
		displaySessionData();
		populateScenesForAct(1);		
		$('#scenes-container').on('click', '.scene .btn-primary', function() {
			let sceneIndex = $(this).closest('.scene').index();
			let sceneTextarea = $(this).siblings('textarea');
			let selectedActNumber = parseInt($('#act-selector').val().replace('act', ''));
			
			jsonData.Acts[selectedActNumber - 1].Scenes[sceneIndex] = sceneTextarea.val();
			sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
		});
		$('#act-selector').change(function() {
		let selectedActNumber = parseInt($(this).val().replace('act', ''));
		populateScenesForAct(selectedActNumber);
		});
        $('#save-draft').click(function() {
			sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
			// Fetch the template .docx file
			fetch('template.docx')  // Replace 'path_to_your_template.docx' with the actual path to your template
			.then(function(response) {
				return response.blob();
			})
			.then(function(blob) {
				return blob.arrayBuffer();
			})
			.then(function(arrayBuffer) {
				var zip = new PizZip(arrayBuffer);
				var doc = new docxtemplater().loadZip(zip);

				// Set the content of the document
				doc.setData({ content: jsonData["Final Draft Text"] });

				try {
					doc.render();
				}
				catch (error) {
					console.error('Error occurred:', error);
					throw error;
				}

				var out = doc.getZip().generate({
					type: "blob",
					mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				});

				// Trigger download
				saveAs(out, "Episode.docx");
			})
			.catch(function(error) {
				console.error('Error occurred:', error);
			});
		});
    });
}
