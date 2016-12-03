var signalingChannel = new BroadcastChannel('webrtc_removetrack_test');
signalingChannel.send = signalingChannel.postMessage;
var audioSender = null;
var videoSender = null;
var remoteStream = null;
var audioReceiver = null;
var videoReceiver = null;
var configuration = null;
var pc = null;

selfView.muted = true;
remoteView.muted = true;
localStream = null;

window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
btnStart.onclick = start;
function start() {
    pc = new RTCPeerConnection(configuration);
    pc.onicecandidate = evt => {
        if (evt.candidate)
            signalingChannel.send(JSON.stringify({ candidate: evt.candidate }));
    };
    pc.onnegotiationneeded = _ => {
        pc.createOffer().then(offer => {
            return pc.setLocalDescription(offer);
        }).then(_ => {
            signalingChannel.send(JSON.stringify({ desc: pc.localDescription }));
        }).catch(err => console.log(err));
    };
    if ('ontrack' in pc) {
        pc.ontrack = function (evt) {
            if (evt.track.kind === 'video') {
                remoteStream = evt.streams[0];
                remoteView.srcObject = evt.streams[0];
                remoteStream = evt.streams[0];
                remoteStream.onremovetrack = evt => {
                    console.log('remote remove track');
                }
                remoteStream.getTracks().forEach(track => {
                    track.onended = evt => {
                        console.log('remote track onend', evt);
                    }
                })
                videoReceiver = evt.receiver;
            } else {
                audioReceiver = evt.receiver;
            }
        };
    } else {
        pc.onaddstream = evt => {
            remoteStream = evt.streams[0];
            remoteView.srcObject = evt.stream;
        }
    }
    pc.onremovestream = evt => {
        console.log('remove stream');
    }
    pc.onremovetrack = evt => {
        console.log('onremovetrack');
    }
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    }).then(stream => {
        localStream = stream;
        selfView.srcObject = stream;
        if (pc.addTrack) {
            audioSender = pc.addTrack(stream.getAudioTracks()[0], stream);
            videoSender = pc.addTrack(stream.getVideoTracks()[0], stream);
        } else {
            pc.addStream(stream);
        }
    }).catch(err => console.log(err));
}

signalingChannel.onmessage = evt => {
    if (!pc) start();
    var message = JSON.parse(evt.data);
    if (message.desc) {
        var desc = message.desc;
        if (desc.type === 'offer') {
            pc.setRemoteDescription(new RTCSessionDescription(desc)).then(_ => {
                return pc.createAnswer();
            }).then(answer => {
                return pc.setLocalDescription(answer);
            }).then(_ => {
                var str = JSON.stringify({ desc: pc.localDescription });
                signalingChannel.send(str);
            }).catch(err => console.log(err));
        } else if (desc.type === 'answer') {
            pc.setRemoteDescription(new RTCSessionDescription(desc)).catch(err => console.log(err));
        } else {
            console.log('Unsupported SDP type. Your code may differ here.');
        }
    } else
        pc.addIceCandidate(new RTCIceCandidate(message.candidate)).catch(err => console.log(err));
};

btnMediaStreamRmoveAudioTrack.onclick = _ => {
    localStream.removeTrack(localStream.getAudioTracks()[0]);
}

btnMediaStreamRemoveVideoTrack.onclick = _ => {
    localStream.removeTrack(localStream.getVideoTracks()[0]);
}

btnPeerConnectionRmoveAudioTrack.onclick = _ => {
    pc.removeTrack(audioSender);
}

btnPeerConnectionRemoveVideoTrack.onclick = _ => {
    pc.removeTrack(videoSender);
}


var audioContext = new AudioContext();
function createDummyAudioTrack() {
    var oscillator = audioContext.createOscillator();
    var dst = oscillator.connect(audioContext.createMediaStreamDestination());
    return dst.stream.getAudioTracks()[0];
}