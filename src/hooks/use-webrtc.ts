"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "~/trpc/react";
import { getPusherClient, conversationChannel, PUSHER_EVENTS } from "~/lib/pusher";

// Note: Replace with production ICE servers (e.g., Twilio/Xirsys) for broader reach
const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

interface UseWebRTCProps {
    conversationId: string;
    userId: string; // The current user's ID
    isVideo?: boolean; // false for audio-only
}

export function useWebRTC({ conversationId, userId, isVideo = true }: UseWebRTCProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [callStatus, setCallStatus] = useState<"idle" | "calling" | "ringing" | "connected">("idle");

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const signalMutation = api.webrtc.signal.useMutation();

    // Create or retrieve PeerConnection
    const getPeerConnection = useCallback(() => {
        if (!peerConnection.current) {
            peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

            // Add local stream tracks to connection
            if (localStream) {
                localStream.getTracks().forEach((track) => {
                    peerConnection.current?.addTrack(track, localStream);
                });
            }

            // Handle incoming remote stream
            peerConnection.current.ontrack = (event) => {
                setRemoteStream(event.streams[0] ?? null);
            };

            // Handle ICE candidates negotiation
            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    signalMutation.mutate({
                        conversationId,
                        signalType: "ice-candidate",
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                    });
                }
            };

            peerConnection.current.onconnectionstatechange = () => {
                if (peerConnection.current?.connectionState === "connected") {
                    setCallStatus("connected");
                } else if (
                    peerConnection.current?.connectionState === "failed" ||
                    peerConnection.current?.connectionState === "disconnected" ||
                    peerConnection.current?.connectionState === "closed"
                ) {
                    endCall();
                }
            };
        }
        return peerConnection.current;
    }, [conversationId, localStream, signalMutation]);

    // Handle incoming signaling events via Pusher
    useEffect(() => {
        if (!conversationId) return;

        const pusher = getPusherClient();
        const channel = pusher.subscribe(conversationChannel(conversationId));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channel.bind(PUSHER_EVENTS.CALL_SIGNALING, async (data: any) => {
            // Ignore our own signals
            if (data.senderId === userId) return;

            if (data.signalType === "end-call") {
                endCall(false); // End call remotely
                return;
            }

            const pc = getPeerConnection();

            try {
                if (data.signalType === "offer") {
                    setCallStatus("ringing");
                    await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: data.sdp }));

                    // Auto-answer logic (or you can separate this to wait for user interaction)
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    signalMutation.mutate({
                        conversationId,
                        signalType: "answer",
                        sdp: answer.sdp,
                    });
                } else if (data.signalType === "answer") {
                    await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: data.sdp }));
                } else if (data.signalType === "ice-candidate") {
                    await pc.addIceCandidate(
                        new RTCIceCandidate({
                            candidate: data.candidate,
                            sdpMid: data.sdpMid,
                            sdpMLineIndex: data.sdpMLineIndex,
                        })
                    );
                }
            } catch (err) {
                console.error("WebRTC Error:", err);
            }
        });

        return () => {
            pusher.unsubscribe(conversationChannel(conversationId));
            channel.unbind(PUSHER_EVENTS.CALL_SIGNALING);
        };
    }, [conversationId, userId, getPeerConnection, signalMutation]);

    const startMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideo,
                audio: true,
            });
            setLocalStream(stream);

            // If PC already exists, add tracks dynamically
            if (peerConnection.current) {
                stream.getTracks().forEach((track) => {
                    peerConnection.current?.addTrack(track, stream);
                });
            }
        } catch (err) {
            console.error("Error accessing media devices.", err);
        }
    };

    const startCall = async () => {
        setIsCallActive(true);
        setCallStatus("calling");

        const pc = getPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        signalMutation.mutate({
            conversationId,
            signalType: "offer",
            sdp: offer.sdp,
        });
    };

    const endCall = (broadcast = true) => {
        if (broadcast) {
            signalMutation.mutate({
                conversationId,
                signalType: "end-call",
            });
        }

        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
            setLocalStream(null);
        }

        setRemoteStream(null);
        setIsCallActive(false);
        setCallStatus("idle");
    };

    return {
        localStream,
        remoteStream,
        isCallActive,
        callStatus,
        startMedia,
        startCall,
        endCall,
        setCallStatus,
    };
}
