"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useWebRTC } from "~/hooks/use-webrtc";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function CallPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const conversationId = params?.conversationId as string;
    const isVideoMode = searchParams.get("type") !== "audio";
    const incoming = searchParams.get("incoming") === "true";

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(!isVideoMode);

    const {
        localStream,
        remoteStream,
        isCallActive,
        callStatus,
        startMedia,
        startCall,
        endCall,
    } = useWebRTC({
        conversationId,
        userId: session?.user?.id ?? "",
        isVideo: isVideoMode,
    });

    // Start media immediately
    useEffect(() => {
        if (status === "authenticated" && conversationId) {
            void startMedia();
        }
    }, [status, conversationId, startMedia]);

    // Handle auto-starting the call if we are the initiator
    useEffect(() => {
        if (localStream && !incoming && !isCallActive && callStatus === "idle") {
            void startCall();
        }
    }, [localStream, incoming, isCallActive, callStatus, startCall]);

    // Bind local stream to video tag
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Bind remote stream to video tag
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Handle call disconnect / redirect back
    useEffect(() => {
        if (callStatus === "idle" && localStream === null && !isCallActive && !incoming) {
            // It implies a hard end
            toast("Call ended");
            router.push(`/messages?conversationId=${conversationId}`);
        }
    }, [callStatus, localStream, isCallActive, incoming, router, conversationId]);

    const handleEndCall = () => {
        endCall(true);
        router.push(`/messages?conversationId=${conversationId}`);
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
            setIsVideoOff(!isVideoOff);
        }
    };

    if (status === "loading") {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    if (!session) {
        return null; // Will be redirected by middleware or auth wrapper
    }

    return (
        <div className="relative flex h-screen w-full flex-col bg-black overflow-hidden">
            {/* Remote Video (Full Screen) */}
            {remoteStream ? (
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="mb-4 h-12 w-12 animate-spin text-white/50" />
                    <h2 className="text-xl font-medium text-white">
                        {callStatus === "calling" ? "Calling..." : "Waiting for peer..."}
                    </h2>
                </div>
            )}

            {/* Local Video (PiP) */}
            <div className="absolute bottom-24 right-4 z-10 w-32 shrink-0 overflow-hidden rounded-xl border-2 border-white/20 bg-gray-900 shadow-xl transition-all sm:bottom-8 sm:w-48">
                {localStream && !isVideoOff ? (
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full scale-x-[-1] object-cover"
                    />
                ) : (
                    <div className="flex aspect-[3/4] items-center justify-center bg-gray-900">
                        <VideoOff className="h-8 w-8 text-white/50" />
                    </div>
                )}
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent p-6 pb-8">
                <Button
                    size="lg"
                    variant={isMuted ? "primary" : "secondary"}
                    className="h-14 w-14 rounded-full shadow-lg"
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>

                <Button
                    size="lg"
                    variant="primary"
                    className="h-16 w-16 rounded-full shadow-lg hover:bg-red-600"
                    onClick={handleEndCall}
                >
                    <PhoneOff className="h-7 w-7" />
                </Button>

                <Button
                    size="lg"
                    variant={isVideoOff ? "primary" : "secondary"}
                    className="h-14 w-14 rounded-full shadow-lg"
                    onClick={toggleVideo}
                >
                    {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
            </div>
        </div>
    );
}
