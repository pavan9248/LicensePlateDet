let mediaStream;
let mediaRecorder;
let recordedChunks = [];
let recordingStopped = false;

document.getElementById('start-camera').addEventListener('click', startCamera);
document.getElementById('start-recording').addEventListener('click', startRecording);
document.getElementById('stop-recording').addEventListener('click', stopRecording);

document.addEventListener("DOMContentLoaded", function() {
    $('#filter').change(function() {
        if ($(this).prop('checked')) {
            document.getElementById('filter-options').style.display = 'block';
            document.getElementById('filters').style.display = 'flex';
            document.getElementById('tracks').style.display = 'none';
        } else {
            document.getElementById('filter-options').style.display = 'none';
            document.getElementById('tracks').style.display = 'block';
            displayAllSongs();
        }
    });
});


function startCamera() {
    const modalBody = document.querySelector('.modal-body');
    document.getElementById('frames').style.display = 'none';
    modalBody.innerHTML = '';
    hideResults();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            mediaStream = stream;
            const videoContainer = document.getElementById('web-cam-container');
            videoContainer.srcObject = mediaStream;
            videoContainer.onloadedmetadata = (e) => {
                videoContainer.play();
            };
            videoContainer.style.display = 'block';
            document.getElementById('start-recording').disabled = false;
            document.getElementById('start-camera').disabled = true;
            document.getElementById('stop-recording').disabled = true;
            document.getElementById('status-text').innerText = '';
        })
        .catch((error) => {
            console.error('Error accessing camera:', error);
        });
}

function startRecording() {
    hideResults();

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        if (recordingStopped) {
            saveVideo(blob);
        }
        document.getElementById('web-cam-container').srcObject = null;
        document.getElementById('start-camera').disabled = false;
        document.getElementById('start-recording').disabled = true;
        document.getElementById('stop-recording').disabled = true;
    };

    mediaRecorder.start();
    document.getElementById('start-recording').disabled = true;
    document.getElementById('stop-recording').disabled = false;
    document.getElementById('status-text').innerText = 'Your video is being recorded...';
}

function stopRecording() {
    document.getElementById('processing-text').style.display = 'block'; 
    document.querySelector('.loader').style.display = 'block';
    recordingStopped = true;
    mediaRecorder.stop();
    mediaStream.getTracks().forEach(track => track.stop());

    document.getElementById('start-camera').disabled = false;
    document.getElementById('start-recording').disabled = true;
    document.getElementById('stop-recording').disabled = true;

    document.getElementById('web-cam-container').srcObject = null;
    document.getElementById('web-cam-container').style.display = 'none';
    document.getElementById('status-text').innerText = 'Video has been successfully recorded...';
}

function saveVideo(blob) {
    const formData = new FormData();
    formData.append('video_data', blob);

    fetch('/save_video', {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json',
        },
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Server Error:', data.message);
                return;
            }

            console.log('Server Response:', data);

            const faceImage = document.getElementById('face-image');
            faceImage.src = 'static/images/face.jpeg';
            faceImage.style.display = 'block';

            const audioImage = document.getElementById('audio-image');
            audioImage.src = 'static/images/audio.png';
            audioImage.style.display = 'block';

            const faceEmotionValue = document.getElementById('face-emotion-value');
            const faceEmotionProbValue = document.getElementById('face-emotion-prob-value');
            const speechEmotionValue = document.getElementById('speech-emotion-value');
            const speechEmotionProbValue = document.getElementById('speech-emotion-prob-value');
            const finalEmotionValue = document.getElementById('final-emotion-value');
            const finalEmotionProbValue = document.getElementById('final-emotion-prob-value');

            faceEmotionValue.innerText = data.face_emotion;
            faceEmotionProbValue.innerText = data.face_emotion_probability;

            speechEmotionValue.innerText = data.speech_emotion;
            speechEmotionProbValue.innerText = data.speech_emotion_probability;

            finalEmotionValue.innerText = data.final_emotion;
            finalEmotionProbValue.innerText = data.final_emotion_probability;
            displayFrames(data.frame_files,data.face_emotions);
           
        })
        .catch(error => {
            console.error('Error saving video on the server:', error);
        });

    recordingStopped = false;
}



function hideResults() {
    document.getElementById('result-container').style.display = 'none';
    document.getElementsByClassName('final-results')[0].style.display = 'none';
}

function displayFrames(frameFiles, faceEmotions) {
    const framesContainer = document.getElementById('frames-container');
    document.getElementById('frames').style.display = 'block';
    framesContainer.style.display = 'flex';
    framesContainer.style.flexWrap = 'wrap'; 
    framesContainer.innerHTML = '';

    frameFiles.forEach((frameFile, index) => {
        const frameContainer = document.createElement('div');
        frameContainer.className = 'frame-container';
        frameContainer.style.display = 'flex'; // Use flexbox for the inner container
        frameContainer.style.flexDirection = 'column'; // Display items vertically

        const img = document.createElement('img');
        img.src = `static/frames/${frameFile}?${Date.now()}`; // Append cache-busting parameter
        img.alt = 'Frame';
        img.style.width = '100px'; 
        img.style.height = '100px'; 
        img.style.margin = '5px';

        const emotionParagraph = document.createElement('p');
        emotionParagraph.style.marginTop = '5px'; // Add some space between the image and the text
        if (faceEmotions && faceEmotions[index]) {
            emotionParagraph.textContent = `${faceEmotions[index]}`;
        } else {
            emotionParagraph.textContent = 'Not Detected';
        }
        frameContainer.appendChild(img);
        frameContainer.appendChild(emotionParagraph);
        framesContainer.appendChild(frameContainer);
    });
}


document.getElementById("submit").addEventListener("click", function() {
    document.getElementById('tracks').style.display = 'block';
    var emotion_val = document.getElementById("emotion-options").value;
    var language_val = document.getElementById("language-options").value;
    getSongsByLanguageAndEmotion(language_val, emotion_val);
});


window.addEventListener('beforeunload', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaStream.getTracks().forEach(track => track.stop());
    }

});