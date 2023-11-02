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
    ]
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

// Page 1 - Initialization and Event Handlers
if (document.title === "Yaddaverse - Episode Creator Step 1") {
    $(document).ready(function() {
        loadJsonDataFromSession();
		displaySessionData();
        // Handle when the "Generate Episode Outline" button is clicked
        $('.btn-primary').click(function() {
			jsonData["IP"] = $('#ip').val();
            jsonData.Characters = $('input[name="character"]:checked').map(function() { return this.value; }).get();
            jsonData["Plot Archetype"] = $('#plotType').val();
            jsonData["Custom Plot Details"] = $('#customPlot').val();
            jsonData["Plot Focuses on"] = $('#episodeFocus').val();
			sessionStorage.setItem("jsonData", JSON.stringify(jsonData));
			window.location.href = "createdraft.html"; 
        });
    });
}

// Page 2 - Initialization and Event Handlers
if (document.title === "Yaddaverse - Episode Creator Step 2") {
    $(document).ready(function() {
		loadJsonDataFromSession();
		displaySessionData();
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
				doc.setData({ content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet." });

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