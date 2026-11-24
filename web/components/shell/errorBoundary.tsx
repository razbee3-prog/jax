"use client";
import {Component,type ReactNode} from "react";
export class SessionErrorBoundary extends Component<{children:ReactNode;report:(error:unknown)=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:unknown){this.props.report(error);}
  render(){return this.state.failed ? <main className="shell"><section className="shell-screen"><h1>Jax couldn’t continue.</h1><p>Reload Jax to try again.</p><button onClick={()=>window.location.reload()}>Reload Jax</button></section></main>:this.props.children;}
}
