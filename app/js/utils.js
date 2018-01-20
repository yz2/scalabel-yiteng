/* global preloaded_images:true polyLabeling:true bboxLabeling:true
 type:true image_list:true numDisplay:true assignment:true
 BBoxLabeling currentIndex:true PolyLabeling updateCategory numPoly:true
*/
/* exported loadAssignment goToImage getIPAddress */

/**
* Summary: Record timestamp in milliseconds, action, and target image index.
* @param {type} action: To be completed.
* @param {type} index: Description.
* @param {type} position: Description.
*/
function addEvent(action, index, position) {
    if (!assignment.events) {
        assignment.events = [];
    }
    let event = {
        'timestamp': Math.round(new Date() / 1000),
        'action': action,
        'targetIndex': index.toString(),
        'position': position, // only applicable to certain actions
    };
    assignment.events.push(event);
}

/**
* Summary: Preload images using browser caching.
* @param {type} imageArray: To be completed.
* @param {type} index: Description.
*/
function preload(imageArray, index) {
    index = index || 0;
    if (imageArray && imageArray.length > index) {
        preloaded_images[index] = new Image();
        preloaded_images[index].onload = function() {
            // addEvent("image loaded", index);
            if (index === 0) {
                // display when the first image is loaded
                if (type == 'bbox') {
                    bboxLabeling = new BBoxLabeling({
                        url: preloaded_images[currentIndex].src,
                    });
                    bboxLabeling.replay();
                } else {
                    polyLabeling = new PolyLabeling({
                        url: preloaded_images[currentIndex].src,
                    });
                    polyLabeling.updateImage(
                        preloaded_images[currentIndex].src);
                }
                numDisplay = numDisplay + 1;
            }
            preload(imageArray, index + 1);
        };
        preloaded_images[index].onerror = function() {
            addEvent('image fails to load', index);
            preload(imageArray, index + 1);
        };
        preloaded_images[index].src = imageArray[index].url;
    } else {
        $('#prev_btn').attr('disabled', false);
        $('#next_btn').attr('disabled', false);
    }
}

/**
* Summary: To be completed.
*
*/
function updateProgressBar() {
    let progress = $('#progress');
    progress.html(' ' + (currentIndex + 1).toString() + '/' +
        image_list.length.toString());
}

/**
* Summary: To be completed.
*
*/
function updateCategorySelect() {
    if (type == 'poly') {
        updateCategory();
    } else {
        let category = assignment.category;
        let categorySelect = $('select#category_select');
        for (let i = 0; i < category.length; i++) {
            if (category[i]) {
                categorySelect.append('<option>' +
                    category[i] + '</option>');
            }
        }
        $('select#category_select').val(assignment.category[0]);
    }
}

/**
* Summary: Update global image list.
*
*/
function saveLabels() {
    if (type == 'bbox') {
        bboxLabeling.submitLabels();
        image_list[currentIndex].labels = bboxLabeling.output_labels;
        image_list[currentIndex].tags = bboxLabeling.output_tags;
    } else {
        polyLabeling.submitLabels();
        image_list[currentIndex].labels = polyLabeling.output_labels;
    }
}

/**
* Summary: To be completed.
*
*/
function submitAssignment() {
    let x = new XMLHttpRequest();
    x.onreadystatechange = function() {
        if (x.readyState === 4) {
            // console.log(x.response)
        }
    };

    assignment.numLabeledImages = currentIndex + 1;
    assignment.userAgent = navigator.userAgent;
    // console.log(assignment.images);
    // console.log(assignment);

    x.open('POST', '/postSubmission');
    x.send(JSON.stringify(assignment));
}

/**
* Summary: To be completed.
*
*/
function submitLog() {
    let x = new XMLHttpRequest();
    x.onreadystatechange = function() {
        if (x.readyState === 4) {
            // console.log(x.response)
        }
    };
    assignment.images = image_list;
    assignment.numLabeledImages = currentIndex + 1;
    assignment.userAgent = navigator.userAgent;

    x.open('POST', '/postLog');
    x.send(JSON.stringify(assignment));
}

/**
* Summary: To be completed.
*
*/
function loadAssignment() {
    let x = new XMLHttpRequest();
    x.onreadystatechange = function() {
        if (x.readyState === 4) {
            // console.log(x.response);
            assignment = JSON.parse(x.response);
            image_list = assignment.images;
            currentIndex = 0;
            addEvent('start labeling', currentIndex);
            assignment.startTime = Math.round(new Date() / 1000);

            // preload images
            preload(image_list);
            if (type == 'poly') {
                for (let idx in image_list) {
                    if (image_list[idx].hasOwnProperty('labels')) {
                        let labels = image_list[idx].labels;
                        for (let key in labels) {
                            if (labels.hasOwnProperty(key)) {
                                // let label = labels[key];
                                // 'label' is assigned a value but never used
                                // To be completed
                                numPoly = numPoly + 1;
                            }
                        }
                    }
                }
                $('#poly_count').text(numPoly);
            }
            updateCategorySelect();
            updateProgressBar();
        }
    };

    // get params from url path
    let searchParams = new URLSearchParams(window.location.search);
    let taskId = searchParams.get('task_id');
    let projectName = searchParams.get('project_name');

    let request = JSON.stringify({
        'assignmentId': taskId,
        'projectName': projectName,
    });

    x.open('POST', '/requestSubmission');
    x.send(request);
}

/**
* Summary: To be completed.
*
*/
function getIPAddress() {
    $.getJSON('//ipinfo.io/json', function(data) {
        assignment.ipAddress = data;
    });
}

/**
* Summary: To be completed.
* @param {type} index: Description.
*/
function goToImage(index) {
    saveLabels();
    // auto save log every twenty five images displayed
    if (numDisplay % 25 === 0 && numDisplay !== 0) {
        submitLog();
        addEvent('save log', index);
    }
    // auto save submission for the current session.
    submitAssignment();

    if (index === -1) {
        alert('This is the first image.');
    } else if (index === image_list.length) {
        addEvent('submit', index);
        alert('Good Job! You\'ve completed this assignment.');
    } else {
        currentIndex = index;
        numDisplay = numDisplay + 1;
        addEvent('save', index);
        if (index === image_list.length - 1) {
            $('#save_btn').text('Submit');
            $('#save_btn').removeClass('btn-primary').addClass('btn-success');
        }
        if (index === image_list.length - 2) {
            $('#save_btn').removeClass('btn-success').addClass('btn-primary');
            $('#save_btn').text('Save');
        }
        addEvent('display', index);
        updateProgressBar();
        if (type == 'bbox') {
            bboxLabeling.updateImage(preloaded_images[index].src);
            bboxLabeling.replay();
        } else {
            polyLabeling.clearAll();
            polyLabeling.updateImage(preloaded_images[index].src);
        }
    }
}