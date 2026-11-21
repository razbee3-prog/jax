type SessionNavigator=Navigator & {audioSession?:{type:"playback"|"play-and-record"}};
export class AudioSession {
  readonly context:AudioContext;
  readonly gain:GainNode;
  readonly analyser:AnalyserNode;
  private microphone?:MediaStream;
  private micSource?:MediaStreamAudioSourceNode;
  private micAnalyser?:AnalyserNode;
  private processor?:AudioWorkletNode;
  private silentSink?:GainNode;
  private silentElement?:HTMLAudioElement;
  private microphoneVersion=0;
  private muted=false;
  private workletReady?:Promise<void>;
  constructor(){this.context=new AudioContext();this.gain=this.context.createGain();this.analyser=this.context.createAnalyser();this.analyser.fftSize=512;this.gain.connect(this.analyser);this.analyser.connect(this.context.destination);}
  async unlock(){
    this.setType("playback");
    const resume=this.context.resume();
    if(!(navigator as SessionNavigator).audioSession){
      if(!this.silentElement){this.silentElement=new Audio("/audio/silence.wav");this.silentElement.loop=true;this.silentElement.setAttribute("playsinline","");}
      await this.silentElement.play();
    }
    await resume;
  }
  private setType(type:"playback"|"play-and-record"){const session=(navigator as SessionNavigator).audioSession;if(session)session.type=type;}
  volume(node:AnalyserNode|undefined){if(!node)return 0;const bytes=new Float32Array(node.fftSize);node.getFloatTimeDomainData(bytes);return Math.min(1,Math.sqrt(bytes.reduce((sum,x)=>sum+x*x,0)/bytes.length)*4);}
  getOutputVolume=()=>this.volume(this.analyser);
  getInputVolume=()=>this.volume(this.micAnalyser);
  muteMicrophone(muted:boolean){this.muted=muted;for(const track of this.microphone?.getAudioTracks()??[])track.enabled=!muted;}
  async startMicrophone(send:(base64:string)=>void){
    this.stopMicrophone();const version=++this.microphoneVersion;this.setType("play-and-record");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});
      if(version!==this.microphoneVersion){stream.getTracks().forEach(t=>t.stop());return;}
      this.microphone=stream;
      this.muteMicrophone(this.muted);
      this.workletReady??=this.context.audioWorklet.addModule("/audio/scribeAudioProcessor.js");await this.workletReady;
      if(version!==this.microphoneVersion)return;
      this.processor=new AudioWorkletNode(this.context,"scribeAudioProcessor@bd293b92cef79b80");
      this.processor.port.postMessage({type:"configure",inputSampleRate:this.context.sampleRate,outputSampleRate:16000});
      this.processor.port.onmessage=({data}:{data:{audioData:ArrayBuffer}})=>{const bytes=new Uint8Array(data.audioData);let text="";for(const b of bytes)text+=String.fromCharCode(b);send(btoa(text));};
      this.micSource=this.context.createMediaStreamSource(stream);this.micAnalyser=this.context.createAnalyser();
      this.silentSink=this.context.createGain();this.silentSink.gain.value=0;
      this.micSource.connect(this.micAnalyser);this.micSource.connect(this.processor);this.processor.connect(this.silentSink);this.silentSink.connect(this.context.destination);
      await this.context.resume();
    }catch(error){this.stopMicrophone();throw error;}
  }
  stopMicrophone(){this.microphoneVersion++;this.microphone?.getTracks().forEach(t=>t.stop());this.microphone=undefined;this.micSource?.disconnect();this.micSource=undefined;this.processor?.disconnect();if(this.processor)this.processor.port.onmessage=null;this.processor=undefined;this.micAnalyser?.disconnect();this.micAnalyser=undefined;this.silentSink?.disconnect();this.setType("playback");}
}
let shared:AudioSession|undefined;
export function getAudioSession(){return shared??=new AudioSession();}
