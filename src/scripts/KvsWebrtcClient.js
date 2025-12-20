import {
    KinesisVideoClient,
    DescribeSignalingChannelCommand,
    GetSignalingChannelEndpointCommand,
} from "@aws-sdk/client-kinesis-video";

import {
    KinesisVideoSignalingClient,
    GetIceServerConfigCommand,
} from "@aws-sdk/client-kinesis-video-signaling";

import {
    SignalingClient,
    Role,
} from "amazon-kinesis-video-streams-webrtc";

export default class KvsWebrtcClient {
    constructor({ channelName, region, credentials, onTrack }) {
        this.channelName = channelName;
        this.region = region;
        this.credentials = credentials;
        this.onTrack = onTrack;

        this.pc = null;
        this.signalingChannelClient = null;
    }

    async start() {

        try {
            /* 1️⃣ KinesisVideo client */
            const kvClient = new KinesisVideoClient({
                region: this.region,
                credentials: this.credentials,
            });

            /* 2️⃣ Describe channel（拿 ARN） */
            const describeResp = await kvClient.send(
                new DescribeSignalingChannelCommand({
                    ChannelName: this.channelName,
                })
            );

            const channelARN = describeResp.ChannelInfo.ChannelARN;

            /* 3️⃣ Get signaling endpoints */
            const endpointResp = await kvClient.send(
                new GetSignalingChannelEndpointCommand({
                    ChannelARN: channelARN,
                    SingleMasterChannelEndpointConfiguration: {
                        Protocols: ["WSS", "HTTPS"],
                        Role: Role.VIEWER,
                    },
                })
            );

            const endpoints = {};
            endpointResp.ResourceEndpointList.forEach((e) => {
                endpoints[e.Protocol] = e.ResourceEndpoint;
            });


            /* 4️⃣ Signaling HTTPS client（拿 ICE） */
            const signalingClientConfig = new KinesisVideoSignalingClient({
                region: this.region,
                endpoint: endpoints.HTTPS,
                credentials: this.credentials,
            });

            const iceResp = await signalingClientConfig.send(
                new GetIceServerConfigCommand({
                    ChannelARN: channelARN,
                })
            );

            // const iceServers = [
            //     { urls: `stun:stun.kinesisvideo.${this.region}.amazonaws.com:443` },
            //     ...iceResp.IceServerList.map((s) => ({
            //         urls: s.Uris,
            //         username: s.Username,
            //         credential: s.Password,
            //     })),
            // ];
            const iceServers = [
                {
                    urls: `stun:stun.kinesisvideo.${this.region}.amazonaws.com:443`,
                },
                ...iceResp.IceServerList
                    .map(server => ({
                        urls: server.Uris.filter(uri => uri.startsWith("turns:")),
                        username: server.Username,
                        credential: server.Password,
                    }))
                    .filter(s => s.urls.length > 0),
            ];


            /* 5️⃣ PeerConnection */
            this.pc = new RTCPeerConnection({ iceServers });

            this.pc.oniceconnectionstatechange = () => {
                console.log("ICE state:", this.pc.iceConnectionState);
            };

            this.pc.ontrack = (event) => {
                this.onTrack?.(event.streams[0]);
            };

            /* 6️⃣ SignalingClient（WSS + SigV4） */
            this.signalingChannelClient = new SignalingClient({
                channelARN,
                channelEndpoint: endpoints.WSS,
                role: Role.VIEWER,
                region: this.region,
                credentials: this.credentials,
                clientId: `${this.channelName}-${Math.random()}`,
            });

            /* ===== Signaling events ===== */

            this.signalingChannelClient.on("open", async () => {

                // Viewer 主動送 offer
                const offer = await this.pc.createOffer({
                    offerToReceiveVideo: true,
                });
                await this.pc.setLocalDescription(offer);
                this.signalingChannelClient.sendSdpOffer(offer);
            });

            this.signalingChannelClient.on("sdpAnswer", async (answer) => {
                await this.pc.setRemoteDescription(answer);
            });


            this.signalingChannelClient.on("iceCandidate", (candidate) => {
                this.pc.addIceCandidate(candidate);
            });

            this.signalingChannelClient.on("error", (err) => {
                console.error("❌ Signaling error", err);
            });

            this.signalingChannelClient.on("close", () => {
                console.log("❌ Signaling closed");
            });

            /* 7️⃣ 開始連線 signaling */
            this.signalingChannelClient.open();

        } catch (err) {
            console.error("❌ KvsWebrtcClient.start() failed", err);
            throw err;
        }
    }

    stop() {
        if (this.signalingChannelClient) {
            this.signalingChannelClient.close();
            this.signalingChannelClient = null;
        }

        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
    }
}
